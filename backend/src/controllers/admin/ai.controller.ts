import { Request, Response } from 'express';

interface GenerateRequest {
  type: 'description' | 'shortDescription' | 'metaDescription' | 'variantDescription' | 'aboutProduct' | 'seoTitle' | 'slug' | 'variantSku' | 'variantBarcode';
  context: {
    name?: string;
    brand?: string;
    category?: string;
    subCategory?: string;
    sku?: string;
    variantType?: string;
    variantValue?: string;
    existingDescription?: string;
    description?: string;
    shortDescription?: string;
    material?: string;
    color?: string;
    size?: string;
    unit?: string;
  };
}

function buildPrompt(type: string, ctx: GenerateRequest['context']): string {
  const productContext = [
    ctx.name && `Product: ${ctx.name}`,
    ctx.brand && `Brand: ${ctx.brand}`,
    ctx.category && `Category: ${ctx.category}`,
    ctx.subCategory && `Sub-category: ${ctx.subCategory}`,
    ctx.sku && `SKU: ${ctx.sku}`,
    ctx.material && `Material: ${ctx.material}`,
    ctx.color && `Color: ${ctx.color}`,
    ctx.size && `Size: ${ctx.size}`,
    ctx.unit && `Unit: ${ctx.unit}`,
  ].filter(Boolean).join('\n');

  switch (type) {
    case 'description':
      return `Write a detailed, engaging product description for the following product. Be specific to this product, not generic. Highlight key features, benefits, and use cases. Keep it between 100-300 words.\n\n${productContext}`;

    case 'shortDescription':
      return `Write a concise one-line product summary (max 150 characters) for the following product. Be specific and compelling.\n\n${productContext}`;

    case 'metaDescription':
      return `Write an SEO-optimized meta description (max 160 characters) for the following product. Include relevant keywords naturally. Be specific to this product.\n\n${productContext}`;

    case 'variantDescription':
      return `Write a product variant description for the following variant. Be specific to this variant and how it differs from other options. Keep it 50-150 words.\n\n${productContext}${ctx.variantType && `\nVariant type: ${ctx.variantType}`}${ctx.variantValue && `\nVariant value: ${ctx.variantValue}`}`;

    case 'aboutProduct':
      return `Generate 5-8 bullet points about the following product. Each bullet should highlight a specific feature or benefit. Be factual and product-specific.\n\nFormat: one bullet point per line, starting with a dash.\n\n${productContext}`;

    case 'seoTitle':
      return `Generate an SEO-optimized page title (max 60 characters) for the following product. Include the product name and brand naturally. Be specific and compelling for search engines.\n\n${productContext}`;

    case 'slug':
      return `Generate a clean, URL-friendly slug for the following product. Requirements: lowercase, spaces→hyphens, remove special characters, no duplicate hyphens, clean URL-safe format. Return ONLY the slug, nothing else.\n\nProduct: ${ctx.name || ''}`;

    case 'variantSku':
      return `Generate an appropriate SKU for the following product variant. Format: PRODUCTNAME-VARIANTVALUE-NNN (e.g. MAGGI-500G-001). Use uppercase, hyphens as separators. Return ONLY the SKU string.\n\n${productContext}${ctx.variantType && `\nVariant type: ${ctx.variantType}`}${ctx.variantValue && `\nVariant value: ${ctx.variantValue}`}`;

    case 'variantBarcode':
      return `Generate a valid 13-digit EAN-13 barcode number for the following product variant. Return ONLY the numeric barcode string (13 digits, no hyphens or spaces).\n\n${productContext}${ctx.variantType && `\nVariant type: ${ctx.variantType}`}${ctx.variantValue && `\nVariant value: ${ctx.variantValue}`}`;

    default:
      return `Generate content for the following product:\n\n${productContext}`;
  }
}

function generateFallbackContent(type: string, ctx: GenerateRequest['context']): string {
  const name = ctx.name || 'this product';
  const brand = ctx.brand || '';
  const category = ctx.category || '';
  const brandPrefix = brand ? `${brand} ` : '';

  switch (type) {
    case 'description':
      return `Discover the ${brandPrefix}${name}${category ? ` from our ${category} collection` : ''}. Crafted with quality and care, this product delivers exceptional value. Whether you're looking for everyday essentials or something special, ${name} is designed to meet your needs with reliability and style. Experience the difference that quality makes.`;

    case 'shortDescription':
      return `Premium ${brandPrefix}${name} — quality you can trust`;

    case 'metaDescription':
      return `Buy ${brandPrefix}${name} online. Best price, fast delivery. ${category ? `Shop ${category} products.` : ''}`;

    case 'variantDescription': {
      const vName = ctx.variantValue || ctx.color || ctx.size || ctx.material || ctx.unit || 'selected';
      return `The ${vName} option of ${brandPrefix}${name} is designed for those who appreciate quality. ${ctx.variantType ? `This ${ctx.variantType.toLowerCase()} variant` : 'This option'} offers the same trusted performance with a tailored choice to fit your preferences.`;
    }

    case 'aboutProduct':
      return [
        `- Premium quality ${brandPrefix}${name}`,
        `- Designed for everyday use`,
        `- Trusted by thousands of customers`,
        `- Quality ingredients and materials`,
        `- Value for money`,
        `- Suitable for all occasions`,
      ].join('\n');

    case 'seoTitle':
      return `${brandPrefix}${name}${category ? ` | ${category}` : ''}`.slice(0, 60);

    case 'slug':
      return (name || 'product').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    case 'variantSku': {
      const base = (name || 'PROD').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      const rawVal = ctx.variantValue || ctx.color || ctx.size || ctx.material || ctx.unit || 'VAR';
      const variant = rawVal.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      const seq = (ctx as any).variantIndex !== undefined
        ? String((ctx as any).variantIndex + 1).padStart(3, '0')
        : Math.random().toString(36).slice(2, 5).toUpperCase();
      return `${base}-${variant}-${seq}`;
    }

    case 'variantBarcode': {
      const idx = (ctx as any).variantIndex !== undefined ? (ctx as any).variantIndex + 1 : Math.floor(Math.random() * 99) + 1;
      const baseDigits = (`400${Date.now().toString().slice(-8)}${idx}`).slice(0, 12).padStart(12, '0');
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(baseDigits[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return `${baseDigits}${checkDigit}`;
    }

    default:
      return `${brandPrefix}${name} - a quality product from our collection.`;
  }
}

export const generateAIContent = async (req: Request, res: Response) => {
  try {
    const { type, context } = req.body as GenerateRequest;

    if (!type) {
      return res.status(400).json({ success: false, message: 'Type is required' });
    }

    const validTypes = ['description', 'shortDescription', 'metaDescription', 'variantDescription', 'aboutProduct', 'seoTitle', 'slug', 'variantSku', 'variantBarcode'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;

    if (apiKey) {
      try {
        const prompt = buildPrompt(type, context || {});
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL || 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful e-commerce product content writer. Write concise, specific, and engaging content. Never use generic placeholders.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: type === 'shortDescription' || type === 'metaDescription' ? 100 : 500,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            return res.json({ success: true, content, source: 'ai' });
          }
        }
      } catch (aiError) {
        console.error('AI API error, falling back to template:', aiError);
      }
    }

    const content = generateFallbackContent(type, context || {});
    return res.json({ success: true, content, source: 'template' });
  } catch (error: any) {
    console.error('AI generation error:', error);
    return res.status(500).json({ success: false, message: error.message || 'AI generation failed' });
  }
};
