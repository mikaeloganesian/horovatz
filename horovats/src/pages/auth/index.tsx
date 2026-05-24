import { type FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import LegalConsent from '../../components/legal/LegalConsent';
import './Auth.css';
import heroImg from '../../assets/hero-img.jpg';

const AuthPage: FC = observer(() => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  
  const { authStore } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const success = await authStore.login(email, password);
      if (success) navigate('/profile');
    } else {
      if (!legalAccepted) {
        return;
      }
      const success = await authStore.register(email, phone, name, password);
      if (success) {
        setIsLogin(true); // switch to login after registration
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-image-side" style={{ backgroundImage: `url(${heroImg})` }}>
          <div className="auth-image-overlay">
            <h2>ХОРОВАЦ</h2>
            <p>Premium доставка блюд на дом</p>
          </div>
        </div>
        
        <div className="auth-form-side">
          <div className="auth-container">
            <div className="auth-header">
              <h1>{isLogin ? 'Вход' : 'Регистрация'}</h1>
              <p>{isLogin ? 'С возвращением! Рады видеть вас снова.' : 'Присоединяйтесь к нашей программе лояльности'}</p>
            </div>

            <div className="auth-tabs">
              <button 
                type="button"
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(true)}
              >
                Войти
              </button>
              <button 
                type="button"
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(false)}
              >
                Создать аккаунт
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {authStore.error && <div style={{ color: 'red', marginBottom: '10px' }}>{authStore.error}</div>}
              
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label htmlFor="name">Имя</label>
                    <input 
                      type="text" 
                      id="name" 
                      placeholder="Иван Иванов" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Телефон</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      placeholder="+7 (999) 000-00-00" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required 
                    />
                  </div>
                </>
              )}
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  placeholder="test@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Пароль</label>
                <input 
                  type="password" 
                  id="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              {!isLogin && (
                <LegalConsent id="auth-legal-consent" checked={legalAccepted} onChange={setLegalAccepted} />
              )}
              <button type="submit" className="auth-submit-btn" disabled={authStore.isLoading || (!isLogin && !legalAccepted)}>
                {authStore.isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AuthPage;
