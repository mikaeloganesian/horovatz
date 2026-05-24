import { type FC } from 'react';
import { Link } from 'react-router-dom';
import './LegalConsent.css';

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
  id?: string;
};

const LegalConsent: FC<Props> = ({ checked, onChange, id = 'legal-consent' }) => (
  <label className="legal-consent" htmlFor={id}>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      required
    />
    <span>
      Я принимаю условия{' '}
      <Link to="/oferta" target="_blank" rel="noopener noreferrer">
        публичной оферты
      </Link>{' '}
      и даю согласие на обработку персональных данных в соответствии с{' '}
      <Link to="/privacy" target="_blank" rel="noopener noreferrer">
        политикой конфиденциальности
      </Link>
      .
    </span>
  </label>
);

export default LegalConsent;
