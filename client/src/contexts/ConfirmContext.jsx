import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useLanguage } from './LanguageContext';

const ConfirmContext = createContext();

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider = ({ children }) => {
    const { language } = useLanguage();
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        cancelText: '',
        isDanger: true,
        resolve: null
    });

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            const titleTranslation = language === 'bg' ? 'Потвърждение' : 'Confirmation';
            
            setConfirmState({
                isOpen: true,
                title: options.title || titleTranslation,
                message: options.message || '',
                confirmText: options.confirmText,
                cancelText: options.cancelText,
                isDanger: options.isDanger !== undefined ? options.isDanger : true,
                resolve
            });
        });
    }, [language]);

    const handleConfirm = () => {
        if (confirmState.resolve) confirmState.resolve(true);
        handleClose();
    };

    const handleClose = () => {
        if (confirmState.resolve) confirmState.resolve(false);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={handleClose}
                onConfirm={handleConfirm}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                isDanger={confirmState.isDanger}
            />
        </ConfirmContext.Provider>
    );
};
