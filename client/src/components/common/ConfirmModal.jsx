import { AlertCircle, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import './ConfirmModal.css';

export const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText, 
    cancelText,
    isDanger = true
}) => {
    const { language } = useLanguage();

    if (!isOpen) return null;

    // Default translations
    const translations = {
        en: {
            cancel: 'Cancel',
            confirm: 'Confirm',
            delete: 'Delete'
        },
        bg: {
            cancel: 'Отказ',
            confirm: 'Потвърди',
            delete: 'Изтрий'
        }
    };

    const t = translations[language] || translations.en;
    
    const finalConfirmText = confirmText || (isDanger ? t.delete : t.confirm);
    const finalCancelText = cancelText || t.cancel;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <div className="title-with-icon">
                        {isDanger ? (
                            <div className="icon-wrapper danger">
                                <AlertCircle size={24} />
                            </div>
                        ) : (
                            <div className="icon-wrapper primary">
                                <HelpCircle size={24} />
                            </div>
                        )}
                        <h3>{title}</h3>
                    </div>
                </div>
                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>
                <div className="confirm-modal-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        {finalCancelText}
                    </button>
                    <button 
                        className={isDanger ? "btn-confirm danger" : "btn-confirm primary"} 
                        onClick={() => {
                            onConfirm();
                        }}
                    >
                        {finalConfirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
