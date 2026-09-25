import { Coupon } from '../models/Coupon';

export type ScratchRuleBasis = 'quantity' | 'order_amount';
export type ScratchRuleDiscountType = 'Percentage' | 'Fixed';

export interface ScratchRuleLike {
  basis: ScratchRuleBasis;
  threshold: number;
  discountType: ScratchRuleDiscountType;
  discountValue: number;
  label?: string;
}

export interface ScratchReward {
  couponId: string;
  code: string;
  name: string;
  description: string;
  label: string;
  discountType: ScratchRuleDiscountType;
  discountValue: number;
  discountAmount: number;
  matchedRule: ScratchRuleLike;
}

export interface FreeDeliveryOffer {
  couponId: string;
  code: string;
  name: string;
  description: string;
  districts: string[];
  districtMatched: boolean;
  unrestricted: boolean;
}

const roundMoney = (value: number) => Math.round(Number(value) * 100) / 100;

export const normalizeDistrict = (value?: string | null): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const dedupeDistricts = (values?: string[] | null): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values ?? []) {
    const trimmed = String(value ?? '').trim().replace(/\s+/g, ' ');
    const key = normalizeDistrict(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
};

export const isDistrictEligible = (districts?: string[] | null, district?: string | null): boolean => {
  const configured = dedupeDistricts(districts);
  if (configured.length === 0) return true;
  return configured.some((item) => normalizeDistrict(item) === normalizeDistrict(district));
};

export const mapScratchRuleInput = (rule: {
  basis: string;
  threshold: number;
  discountType: string;
  discountValue: number;
  label?: string;
}): ScratchRuleLike => ({
  basis: rule.basis === 'order_amount' ? 'order_amount' : 'quantity',
  threshold: Math.max(Number(rule.threshold) || 0, 0),
  discountType: rule.discountType === 'fixed' ? 'Fixed' : 'Percentage',
  discountValue: Math.max(Number(rule.discountValue) || 0, 0),
  ...(rule.label ? { label: rule.label.trim() } : {}),
});

export const isScratchRuleMatch = (rule: ScratchRuleLike, totalQuantity: number, orderAmount: number): boolean => {
  if (rule.basis === 'quantity') return totalQuantity >= rule.threshold;
  return orderAmount >= rule.threshold;
};

export const getScratchRuleDiscount = (rule: ScratchRuleLike, orderAmount: number): number => {
  if (orderAmount <= 0 || rule.discountValue <= 0) return 0;
  const raw = rule.discountType === 'Fixed'
    ? rule.discountValue
    : (orderAmount * Math.min(rule.discountValue, 100)) / 100;
  return roundMoney(Math.min(raw, orderAmount));
};

export const buildScratchRuleLabel = (rule: ScratchRuleLike): string => {
  if (rule.label) return rule.label;
  const value = rule.discountType === 'Fixed'
    ? `₹${Math.round(rule.discountValue).toLocaleString('en-IN')} OFF`
    : `${Math.round(rule.discountValue * 100) / 100}% OFF`;
  return rule.basis === 'quantity'
    ? `${value} for ${rule.threshold}+ item${rule.threshold === 1 ? '' : 's'}`
    : `${value} on orders above ₹${Math.round(rule.threshold).toLocaleString('en-IN')}`;
};

const isCouponLive = (coupon: any, now: Date): boolean => {
  if (!coupon) return false;
  if (coupon.isActive === false) return false;
  if (coupon.status && coupon.status !== 'active') return false;
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return false;
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return false;
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return false;
  return true;
};

export const resolveScratchReward = (
  coupon: any,
  context: { totalQuantity: number; orderAmount: number }
): ScratchReward | null => {
  if (!isCouponLive(coupon, new Date())) return null;
  if (coupon.offerType !== 'scratch_card') return null;

  const rules: ScratchRuleLike[] = Array.isArray(coupon.scratchRules) ? coupon.scratchRules : [];
  if (rules.length === 0) return null;

  const matches = rules
    .filter((rule) => isScratchRuleMatch(rule, context.totalQuantity, context.orderAmount))
    .map((rule, index) => ({ rule, index, discountAmount: getScratchRuleDiscount(rule, context.orderAmount) }))
    .filter((entry) => entry.discountAmount > 0);

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    if (b.discountAmount !== a.discountAmount) return b.discountAmount - a.discountAmount;
    if (b.rule.threshold !== a.rule.threshold) return b.rule.threshold - a.rule.threshold;
    return a.index - b.index;
  });

  const best = matches[0];
  let discountAmount = best.discountAmount;
  if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
    discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
  }
  discountAmount = roundMoney(Math.min(discountAmount, context.orderAmount));

  return {
    couponId: String(coupon._id),
    code: coupon.code,
    name: coupon.name,
    description: coupon.description || '',
    label: buildScratchRuleLabel(best.rule),
    discountType: best.rule.discountType,
    discountValue: best.rule.discountValue,
    discountAmount,
    matchedRule: best.rule,
  };
};

export const pickBestScratchReward = (
  coupons: any[],
  context: { totalQuantity: number; orderAmount: number }
): ScratchReward | null => {
  const rewards = (coupons || [])
    .filter((coupon) => coupon.offerType === 'scratch_card')
    .map((coupon) => resolveScratchReward(coupon, context))
    .filter((reward): reward is ScratchReward => reward !== null);

  if (rewards.length === 0) return null;

  rewards.sort((a, b) => {
    if (b.discountAmount !== a.discountAmount) return b.discountAmount - a.discountAmount;
    if (b.discountValue !== a.discountValue) return b.discountValue - a.discountValue;
    return String(a.couponId).localeCompare(String(b.couponId));
  });

  return rewards[0];
};

export const resolveFreeDeliveryOffer = (coupons: any[], district?: string | null): FreeDeliveryOffer | null => {
  const live = (coupons || []).filter((coupon) => isCouponLive(coupon, new Date()));

  const freeDeliveryCoupons = live.filter(
    (coupon) => coupon.discountType === 'Free Delivery' && coupon.offerType !== 'scratch_card'
  );
  if (freeDeliveryCoupons.length === 0) return null;

  const districtMatched = freeDeliveryCoupons.find((coupon) => isDistrictEligible(coupon.freeDeliveryDistricts, district));
  if (districtMatched) {
    return {
      couponId: String(districtMatched._id),
      code: districtMatched.code,
      name: districtMatched.name,
      description: districtMatched.description || '',
      districts: dedupeDistricts(districtMatched.freeDeliveryDistricts),
      districtMatched: true,
      unrestricted: dedupeDistricts(districtMatched.freeDeliveryDistricts).length === 0,
    };
  }

  return {
    couponId: String(freeDeliveryCoupons[0]._id),
    code: freeDeliveryCoupons[0].code,
    name: freeDeliveryCoupons[0].name,
    description: freeDeliveryCoupons[0].description || '',
    districts: dedupeDistricts(freeDeliveryCoupons[0].freeDeliveryDistricts),
    districtMatched: false,
    unrestricted: dedupeDistricts(freeDeliveryCoupons[0].freeDeliveryDistricts).length === 0,
  };
};

export const isOfferLive = (coupon: any, now = new Date()): boolean => isCouponLive(coupon, now);

export interface AppliedOfferResolution {
  coupon: any | null;
  scratchReward: ScratchReward | null;
  freeDelivery: boolean;
  discountAmount: number;
  error: string | null;
}

export const resolveAppliedOffer = async (input: {
  couponId?: string | null;
  district?: string | null;
  totalQuantity: number;
  orderAmount: number;
}): Promise<AppliedOfferResolution> => {
  const empty: AppliedOfferResolution = {
    coupon: null,
    scratchReward: null,
    freeDelivery: false,
    discountAmount: 0,
    error: null,
  };

  const couponId = input.couponId ? String(input.couponId) : '';
  if (!couponId) return empty;

  const coupon = await Coupon.findById(couponId).lean();
  if (!coupon) return { ...empty, error: 'This offer could not be found' };
  if (!isOfferLive(coupon)) return { ...empty, coupon, error: 'This offer is no longer active' };

  if (coupon.offerType === 'scratch_card') {
    const reward = resolveScratchReward(coupon, {
      totalQuantity: input.totalQuantity,
      orderAmount: input.orderAmount,
    });
    if (!reward) {
      return { ...empty, coupon, error: 'This scratch card offer does not match your cart' };
    }
    return { coupon, scratchReward: reward, freeDelivery: false, discountAmount: reward.discountAmount, error: null };
  }

  if (coupon.discountType === 'Free Delivery') {
    if (!isDistrictEligible(coupon.freeDeliveryDistricts, input.district)) {
      return {
        coupon,
        scratchReward: null,
        freeDelivery: false,
        discountAmount: 0,
        error: buildFreeDeliveryRejectionMessage(coupon, input.district),
      };
    }
    return { coupon, scratchReward: null, freeDelivery: true, discountAmount: 0, error: null };
  }

  if (coupon.minOrderAmount > 0 && input.orderAmount < coupon.minOrderAmount) {
    return {
      ...empty,
      coupon,
      error: `Minimum order amount of ₹${coupon.minOrderAmount} required`,
    };
  }

  if (coupon.minQuantity > 0 && input.totalQuantity < coupon.minQuantity) {
    return {
      ...empty,
      coupon,
      error: `Minimum ${coupon.minQuantity} items required for this offer`,
    };
  }

  const raw = (input.orderAmount * Math.min(Number(coupon.discountValue) || 0, 100)) / 100;
  const capped = coupon.maxDiscountAmount ? Math.min(raw, coupon.maxDiscountAmount) : raw;

  return {
    coupon,
    scratchReward: null,
    freeDelivery: false,
    discountAmount: roundMoney(Math.min(capped, input.orderAmount)),
    error: null,
  };
};

export const buildFreeDeliveryRejectionMessage = (coupon: any, district?: string | null): string => {
  const districts = dedupeDistricts(coupon?.freeDeliveryDistricts);
  if (districts.length === 0) {
    return 'This free delivery offer is not available right now.';
  }
  const target = String(district ?? '').trim();
  if (!target) {
    return `Free delivery is only available in: ${districts.slice(0, 5).join(', ')}. Add your delivery district to continue.`;
  }
  return `Free delivery for this offer is limited to: ${districts.slice(0, 5).join(', ')}.`;
};

export const getActiveOfferCoupons = async (): Promise<any[]> => {
  return Coupon.find({
    isActive: true,
    status: 'active',
    startsAt: { $lte: new Date() },
    expiresAt: { $gte: new Date() },
    $expr: { $or: [{ $eq: ['$usageLimit', 0] }, { $lt: ['$usedCount', '$usageLimit'] }] },
  }).lean();
};
