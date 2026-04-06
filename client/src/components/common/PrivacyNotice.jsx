import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './PrivacyNotice.css';

const COOKIE_KEY = 'cookie_consent';

const translations = {
    bg: {
        title: 'Използваме бисквитки 🍪',
        body: 'Този уебсайт използва бисквитки, за да подобри вашето изживяване. Бисквитките ни помагат да запомним вашите предпочитания, да поддържаме сесията ви активна и да подобрим функционалността на платформата.',
        accept: 'Приемам',
        decline: 'Отказвам',
    },
    en: {
        title: 'We use cookies 🍪',
        body: 'This website uses cookies to enhance your experience. Cookies help us remember your preferences, keep your session active, and improve the overall functionality of the platform.',
        accept: 'Accept',
        decline: 'Decline',
    },
};

export const PrivacyNotice = () => {
    const { language } = useLanguage();
    const t = translations[language] || translations.bg;

    const [visible, setVisible] = useState(false);
    const [hiding, setHiding] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_KEY);
        if (!consent) {
            // Small delay so the page renders first
            const timer = setTimeout(() => setVisible(true), 600);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismiss = useCallback((accepted) => {
        setHiding(true);
        setTimeout(() => {
            localStorage.setItem(COOKIE_KEY, accepted ? 'accepted' : 'declined');
            setVisible(false);
            setHiding(false);
        }, 380);
    }, []);

    if (!visible) return null;

    return (
        <>
            <div className={`cookie-overlay${hiding ? ' cookie-hide' : ''}`} />
            <div className={`cookie-banner${hiding ? ' cookie-hide' : ''}`}>
                <div className="cookie-card">
                    <div className="cookie-header">
                        <span className="cookie-icon">🍪</span>
                        <h3>{t.title}</h3>
                    </div>

                    <div className="cookie-body">
                        <p>{t.body}</p>
                    </div>

                    <div className="cookie-actions">
                        <button
                            className="cookie-btn-accept"
                            onClick={() => dismiss(true)}
                            id="cookie-accept-btn"
                        >
                            {t.accept}
                        </button>
                        <button
                            className="cookie-btn-decline"
                            onClick={() => dismiss(false)}
                            id="cookie-decline-btn"
                        >
                            {t.decline}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
