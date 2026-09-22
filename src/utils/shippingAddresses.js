export const profileShippingAddressId = "profile-default";
export const shippingAddressStorageKey = "machinichiShippingAddresses";
export const shippingAddressUpdatedEvent = "machinichi:shipping-addresses-updated";

export const emptyShippingAddress = {
  fullName: "",
  streetAddress: "",
  city: "",
  zipCode: "",
  phoneNumber: "",
};

const normalizeAddress = (address = {}) => ({
  fullName: String(address.fullName || "").trim(),
  streetAddress: String(address.streetAddress || "").trim(),
  city: String(address.city || "").trim(),
  zipCode: String(address.zipCode || "").trim(),
  phoneNumber: String(address.phoneNumber || "").trim(),
});

const notifyShippingAddressesUpdated = () => {
  window.dispatchEvent(new Event(shippingAddressUpdatedEvent));
};

export const isCompleteShippingAddress = (address) => {
  const normalized = normalizeAddress(address);

  return (
    normalized.fullName.length > 1 &&
    normalized.streetAddress.length > 4 &&
    normalized.city.length > 1 &&
    /^\d{5,6}$/.test(normalized.zipCode) &&
    /^\d{10}$/.test(normalized.phoneNumber)
  );
};

export const formatShippingAddress = (address) => {
  const normalized = normalizeAddress(address);

  return [normalized.fullName, normalized.streetAddress, normalized.city, normalized.zipCode]
    .filter(Boolean)
    .join(", ");
};

export const readShippingAddresses = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(shippingAddressStorageKey) || "[]");
    const addresses = Array.isArray(parsed) ? parsed : [parsed];

    return addresses
      .map((address, index) => ({
        id: address.id || `saved-${index}`,
        label: address.label || (address.id === profileShippingAddressId ? "Profile Address" : "Saved Address"),
        source: address.source || (address.id === profileShippingAddressId ? "profile" : "checkout"),
        ...normalizeAddress(address),
      }))
      .filter(isCompleteShippingAddress);
  } catch {
    return [];
  }
};

export const readProfileShippingAddress = () =>
  readShippingAddresses().find((address) => address.id === profileShippingAddressId) || {
    id: profileShippingAddressId,
    label: "Profile Address",
    source: "profile",
    ...emptyShippingAddress,
  };

export const writeShippingAddresses = (addresses) => {
  localStorage.setItem(shippingAddressStorageKey, JSON.stringify(addresses));
  notifyShippingAddressesUpdated();
};

export const saveProfileShippingAddress = (address) => {
  const profileAddress = {
    id: profileShippingAddressId,
    label: "Profile Address",
    source: "profile",
    updatedAt: new Date().toISOString(),
    ...normalizeAddress(address),
  };
  const otherAddresses = readShippingAddresses().filter((savedAddress) => savedAddress.id !== profileShippingAddressId);
  const nextAddresses = [profileAddress, ...otherAddresses];

  writeShippingAddresses(nextAddresses);

  return profileAddress;
};

export const addCheckoutShippingAddress = (address) => {
  const normalized = normalizeAddress(address);
  const nextAddress = {
    id: `checkout-${Date.now()}`,
    label: `${normalized.fullName} - ${normalized.city}`,
    source: "checkout",
    createdAt: new Date().toISOString(),
    ...normalized,
  };
  const nextAddresses = [...readShippingAddresses(), nextAddress];

  writeShippingAddresses(nextAddresses);

  return nextAddress;
};
