import { type FC } from 'react';
import logo from '../../assets/logo.png';
import './LoadingScreen.css';

type Props = {
  exiting: boolean;
  onExited: () => void;
};

const LoadingScreen: FC<Props> = ({ exiting, onExited }) => {
  return (
    <div
      className={`loading-screen${exiting ? ' loading-screen--exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label="Загрузка"
      onTransitionEnd={(e) => {
        if (exiting && e.propertyName === 'opacity') {
          onExited();
        }
      }}
    >
      <img src={logo} alt="ХОРОВАЦ" className="loading-screen__logo" />
      <div className="loading-screen__spinner" aria-hidden />
      <span className="loading-screen__text">Загрузка меню</span>
    </div>
  );
};

export default LoadingScreen;
