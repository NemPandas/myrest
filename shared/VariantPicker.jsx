import React from 'react';
import { useTranslation } from './I18nContext.jsx';

export function VariantPicker({ variants, value, onChange, name = 'variant', disabled = false }) {
  const t = useTranslation();
  if (!variants.length) return null;
  return <fieldset className="variant-picker" disabled={disabled}>
    <legend>{t('Szín')}</legend>
    <div className="variant-picker-options">
      {variants.map(variant => <label className="variant-picker-option" key={variant.code}>
        <input type="radio" name={name} value={variant.code} checked={value === variant.code}
          onChange={() => onChange(variant.code)} />
        <span className="variant-choice">
          <span className={'variant-swatch' + (variant.color_hex ? '' : ' variant-swatch-unspecified')}
            style={variant.color_hex ? { backgroundColor: variant.color_hex } : undefined} aria-hidden="true" />
          <span className="variant-choice-name">{variant.color_name}</span>
          <span className="variant-choice-check" aria-hidden="true" />
        </span>
      </label>)}
    </div>
  </fieldset>;
}
