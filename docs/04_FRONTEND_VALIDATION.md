# Machinichi — Frontend Validation Strategy
> Complete validation approach for all forms, inputs, and user interactions

---

## 1. Validation Architecture

```
User Input → Client-Side Validation → API Request → Server-Side Validation (Zod) → Database
     ↑                ↑                                    ↑
  Real-time      Immediate feedback               Final security gate
  (onBlur/onChange)  (visual errors)              (never trust client)
```

### Principle: Validate Early, Validate Often
- **Frontend**: UX-focused, immediate feedback, not security-critical
- **Backend**: Security-critical, never trust client data
- **Dual validation**: All forms validated on both sides

---

## 2. Form Validation Patterns

### Common Validation Rules

| Field | Rules | Pattern |
|-------|-------|---------|
| Full Name | Required, 2-100 chars, letters+spaces only | `/^[a-zA-Z\s]{2,100}$/` |
| Email | Required, valid format, max 254 chars | Built-in `.email()` or RFC 5322 |
| Phone | Optional, 10 digits (E.164) | `/^\d{10}$/` |
| Password | Min 8, uppercase, lowercase, number, special char | Regex combined |
| PIN Code | 6 digits | `/^\d{6}$/` |
| GST Number | 15 chars (Indian format) | `/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/` |
| Price | Positive number, max 2 decimals | `step="0.01" min="0"` |
| Quantity | Positive integer, min 1 | `min="1" step="1"` |
| URL | Valid URL or empty | Built-in validation |

### Pattern: useValidation Hook
```jsx
function useValidation(schema, values) {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback((field, value) => {
    try {
      // Use Zod schema subset for field-level validation
      const fieldSchema = schema.shape[field];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => ({ ...prev, [field]: undefined }));
        return true;
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: err.errors[0].message }));
        return false;
      }
    }
    return true;
  }, [schema]);

  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validate(field, values[field]);
  }, [validate, values]);

  const handleChange = useCallback((field, value) => {
    // Only validate on change if field was already touched
    if (touched[field]) {
      validate(field, value);
    }
  }, [validate, touched]);

  const validateAll = useCallback(() => {
    const allTouched = {};
    let isValid = true;
    Object.keys(schema.shape).forEach(key => {
      allTouched[key] = true;
      if (!validate(key, values[key])) isValid = false;
    });
    setTouched(allTouched);
    return isValid;
  }, [validate, values, schema]);

  const isValid = Object.values(errors).filter(Boolean).length === 0;
  const isDirty = Object.keys(touched).length > 0;

  return { errors, touched, handleBlur, handleChange, validateAll, isValid, isDirty };
}
```

---

## 3. Form-Specific Validation

### Registration Form (CreateAccount.jsx)

| Field | Rules | Frontend | Backend |
|-------|-------|----------|---------|
| fullName | 2-100 chars, alphabetic | ✅ onChange + onBlur | ✅ Zod |
| email | Valid email, max 254 chars | ✅ onChange + onBlur | ✅ Zod |
| phone | Optional, 10 digits | ✅ onBlur | ✅ Zod (optional) |
| password | 8+ chars, upper, lower, number, special | ✅ Real-time strength meter | ✅ Zod regex |
| confirmPassword | Must match password | ✅ onChange comparison | ✅ Zod refine |
| termsAccepted | Must be checked | ✅ onSubmit check | — |
| captchaToken | Required (hCaptcha) | ✅ onVerify callback | ✅ Verify with hCaptcha API |

**Critical Fix Needed**: Current Gmail-only regex (`/^[a-zA-Z0-9._%+-]+@gmail\.com$/`) must be replaced with universal email validation.

### Sign In Form (SignIn.jsx)

| Field | Rules | Frontend | Backend |
|-------|-------|----------|---------|
| email/phone | Non-empty, valid format | ✅ onBlur | ✅ Zod |
| password | Non-empty | ✅ onBlur | ✅ Zod |
| rememberMe | Boolean flag | ✅ Checkbox state | — |

**Security**: Generic error "Invalid email or password" — never reveal which field is wrong.

### Checkout Form (Checkout.jsx)

| Field | Rules | Frontend | Backend |
|-------|-------|----------|---------|
| fullName | Required, 2-100 chars | ✅ onBlur | ✅ Zod |
| phoneNumber | 10 digits | ✅ onBlur + format | ✅ Zod |
| streetAddress | Required, max 500 chars | ✅ onBlur | ✅ Zod |
| city | Required, alphabetic | ✅ onBlur | ✅ Zod |
| state | Required | ✅ Select dropdown | ✅ Zod |
| zipCode | 6 digits | ✅ onBlur + format | ✅ Zod |
| deliveryNotes | Optional, max 500 chars | ✅ Character count | ✅ Zod |
| shippingMethod | Required (standard/express) | ✅ Radio select | ✅ Zod |
| promoCode | Optional, uppercase alpha-numeric | ✅ Format check | ✅ Backend validation |

### Password Reset (Forgotpassword.jsx)

| Field | Rules | Frontend | Backend |
|-------|-------|----------|---------|
| email | Valid email | ✅ onBlur | ✅ Zod |
| otp | 6 digits | ✅ Auto-focus between inputs | ✅ Hashed comparison |
| newPassword | Same as registration | ✅ Real-time strength meter | ✅ Zod |
| confirmPassword | Must match | ✅ onChange comparison | ✅ Zod refine |

### Profile Update (Profile.jsx)

| Field | Rules | Frontend | Backend |
|-------|-------|----------|---------|
| fullName | 2-100 chars | ✅ onBlur | ✅ Zod |
| email | Valid email (with verification) | ✅ onBlur | ✅ Zod |
| phone | 10 digits (with OTP) | ✅ Format + OTP | ✅ Zod |
| currentPassword | Required for changes | ✅ onBlur | ✅ bcrypt compare |
| newPassword | Same rules as registration | ✅ Strength meter | ✅ Zod |

### Admin Product Form

| Field | Rules | Frontend | Backend |
|-------|-------|----------|---------|
| name | Required, 3-200 chars | ✅ onBlur | ✅ Zod |
| sku | Required, unique format | ✅ Format + uniqueness | ✅ Zod + DB check |
| category | Required ObjectId | ✅ Select | ✅ Zod |
| mrpPrice | Positive number, > sellingPrice | ✅ Validation | ✅ Zod |
| sellingPrice | Positive number, < mrpPrice | ✅ Validation | ✅ Zod |
| quantity | Non-negative integer | ✅ min="0" step="1" | ✅ Zod |
| images | 1-10 files, jpg/png/webp | ✅ File type + size | ✅ Multer config |
| gstRate | 0/5/12/18 | ✅ Select | ✅ Zod enum |
| description | Required, 50-5000 chars | ✅ Character count | ✅ Zod |

---

## 4. Real-Time Validation Components

### Password Strength Meter
```jsx
function PasswordStrengthMeter({ password }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
  ];

  const strength = checks.filter(c => c.pass).length;
  const color = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const label = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

  return (
    <div className="space-y-2 mt-2">
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full transition-all ${color[strength - 1] || 'bg-gray-200'}`}
             style={{ width: `${(strength / 5) * 100}%` }} />
      </div>
      <p className="text-xs font-medium text-gray-500">{label[strength - 1] || ''}</p>
      <ul className="space-y-1">
        {checks.map(check => (
          <li key={check.label}
              className={`text-xs flex items-center gap-1.5 ${check.pass ? 'text-green-600' : 'text-gray-400'}`}>
            {check.pass ? <Check size={12} /> : <X size={12} />}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Phone Input with Country Code
```jsx
function PhoneInput({ value, onChange, countryCode, onCountryChange }) {
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(digits);
    if (digits.length > 0 && digits.length < 10) {
      setError('Phone must be 10 digits');
    } else {
      setError('');
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <select value={countryCode} onChange={onCountryChange}
                className="w-28 rounded-lg border px-3 py-2.5 text-sm">
          <option value="+91">🇮🇳 +91</option>
          <option value="+1">🇺🇸 +1</option>
          <option value="+44">🇬🇧 +44</option>
        </select>
        <input type="tel" value={value} onChange={handleChange}
               placeholder="9876543210"
               className="flex-1 rounded-lg border px-3 py-2.5 text-sm"
               inputMode="numeric" />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
```

### OTP Input (6-Digit Split)
```jsx
function OTPInput({ length = 6, onComplete }) {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const refs = useRef([]);

  const handleChange = (index, value) => {
    if (value.length > 1) return; // Only single digit
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < length - 1) {
      refs.current[index + 1].focus();
    }

    // Check complete
    if (newOtp.every(d => d) && onComplete) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      refs.current[index - 1].focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1].focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1].focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {otp.map((digit, i) => (
        <input key={i} ref={el => refs.current[i] = el}
               type="text" inputMode="numeric" maxLength={1}
               value={digit} autoFocus={i === 0}
               onChange={e => handleChange(i, e.target.value)}
               onKeyDown={e => handleKeyDown(i, e)}
               className="h-14 w-12 rounded-xl border-2 text-center text-xl font-bold
                         focus:border-brand focus:ring-2 focus:ring-brand/20
                         [&:not(:placeholder-shown)]:animate-pop
                         invalid:animate-shake"
               aria-label={`OTP digit ${i + 1}`} />
      ))}
    </div>
  );
}
```

### Price Input with Formatting
```jsx
function PriceInput({ value, onChange, label = 'Price', required = true }) {
  const formatPrice = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
        <input type="number" step="0.01" min="0" value={value}
               onChange={e => onChange(e.target.value)}
               className="w-full rounded-lg border pl-8 pr-3 py-2.5 text-sm"
               placeholder="0.00" required={required} />
      </div>
    </div>
  );
}
```

---

## 5. Error Display Pattern

### Inline Field Errors
```jsx
function FormField({ label, error, touched, children }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      {children}
      {error && touched && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
```

### Form-Level Errors
```jsx
function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
      <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}
```

### Form Success
```jsx
function FormSuccess({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-start gap-2">
      <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
      <p className="text-sm text-green-700">{message}</p>
    </div>
  );
}
```

---

## 6. Input Sanitization

### NoSQL Injection Prevention
```jsx
// Frontend: Strip $ and . from search inputs
function sanitizeSearchInput(input) {
  return input.replace(/[$.{}()\[\]\\]/g, '').trim();
}

// Backend: express-mongo-sanitize already configured
```

### XSS Prevention
```jsx
// Never use dangerouslySetInnerHTML
// Always use React's built-in escaping
const userInput = "<script>alert('xss')</script>";
// React auto-escapes: &lt;script&gt;alert('xss')&lt;/script&gt;

// For any HTML that must be rendered, sanitize with DOMPurify:
import DOMPurify from 'dompurify';
const safeHTML = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: ['b', 'i', 'em'] });
```

---

## 7. Validation Utilities

```jsx
// src/utils/validation.js

export const VALIDATION_RULES = {
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s'-]+$/,
    message: 'Name must be 2-100 alphabetic characters',
  },
  email: {
    required: true,
    maxLength: 254,
    message: 'Please enter a valid email address',
  },
  phone: {
    required: false,
    minLength: 10,
    maxLength: 10,
    pattern: /^\d{10}$/,
    message: 'Phone must be 10 digits',
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/,
    message: 'Password must contain uppercase, lowercase, number, and special character',
  },
  pincode: {
    required: true,
    minLength: 6,
    maxLength: 6,
    pattern: /^\d{6}$/,
    message: 'PIN code must be 6 digits',
  },
  price: {
    required: true,
    min: 0.01,
    max: 999999,
    message: 'Enter a valid price',
  },
  quantity: {
    required: true,
    min: 1,
    integer: true,
    message: 'Quantity must be a positive number',
  },
};

export function validateField(field, value) {
  const rule = VALIDATION_RULES[field];
  if (!rule) return null;

  if (rule.required && (!value || value.toString().trim() === '')) {
    return `${field} is required`;
  }
  if (value) {
    if (rule.minLength && value.length < rule.minLength) {
      return `Minimum ${rule.minLength} characters`;
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return `Maximum ${rule.maxLength} characters`;
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message;
    }
    if (rule.min && parseFloat(value) < rule.min) {
      return `Minimum value is ${rule.min}`;
    }
    if (rule.max && parseFloat(value) > rule.max) {
      return `Maximum value is ${rule.max}`;
    }
  }
  return null;
}
```

---

## 8. Validation Flow by Page

### Registration Flow
```
1. [onChange] → Password strength meter updates in real-time
2. [onBlur]   → Individual field validates, shows error
3. [onSubmit] → Full form validates, shows all errors
4. [Success]  → Redirect to OTP verification
5. [Error]    → Show API error (e.g. "Email already registered")
```

### Checkout Flow
```
1. [onMount]  → Load saved addresses, validate cart items
2. [onBlur]   → Address field validation
3. [onSubmit] → Full form validates + promo code validation on backend
4. [onSuccess]→ Create payment order, redirect to Razorpay
5. [onError]  → Show specific error (invalid promo, out of stock, etc.)
```

### Admin Product Form
```
1. [onChange] → Slug auto-generation, SKU format check
2. [onBlur]   → Field validation
3. [onSubmit] → Full form validates + image upload
4. [Gateway]  → REQUIRED_TO_LIST check before publish
5. [onError]  → Show validation errors inline
```

---

## 9. Current Validation Issues (From Audit)

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| Gmail-only email regex | CreateAccount.jsx + auth.validator.ts | 🔴 Critical | Use universal email validation |
| Dev mode OTP visible in UI | CreateAccount.jsx | 🔴 Critical | Wrap in import.meta.env.DEV |
| No CAPTCHA on signup | CreateAccount.jsx | 🟠 High | Add hCaptcha |
| No Terms acceptance | CreateAccount.jsx | 🟡 Medium | Add required checkbox |
| Promo codes hardcoded | Checkout.jsx | 🟠 High | Move validation to backend |
| Scratch card frontend-only | Checkout.jsx | 🟠 High | Server-side validation |
| Cart state in-memory only | App.jsx | 🟠 High | Persist to localStorage/backend |
| Wishlist in-memory Set | App.jsx | 🟠 High | Persist to backend |
| Hardcoded localhost URLs | All pages | 🟠 High | Use VITE_API_BASE_URL env |
| No dirty state tracking | Profile.jsx | 🟡 Medium | Add form dirty detection |
