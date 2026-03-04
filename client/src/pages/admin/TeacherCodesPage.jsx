import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Key, Plus, Trash2, Copy, Check, RefreshCw } from 'lucide-react';
import './TeacherCodesPage.css';

export const TeacherCodesPage = () => {
    const [codes, setCodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(null);

    useEffect(() => { loadCodes(); }, []);

    const loadCodes = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/admin/teacher-codes');
            setCodes(res.data.data?.codes || []);
        } catch (e) {
            setError('Failed to load codes.');
        } finally {
            setIsLoading(false);
        }
    };

    const generateCode = async () => {
        setIsGenerating(true);
        try {
            await apiClient.post('/admin/teacher-codes', {});
            await loadCodes();
        } catch (e) {
            setError('Failed to generate code.');
        } finally {
            setIsGenerating(false);
        }
    };

    const deleteCode = async (id) => {
        if (!window.confirm('Delete this code?')) return;
        try {
            await apiClient.delete(`/admin/teacher-codes/${id}`);
            setCodes(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            setError('Failed to delete code.');
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(code);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    const unused = codes.filter(c => !c.is_used);
    const used = codes.filter(c => c.is_used);

    return (
        <div className="admin-page tcp-page">
            <div className="tcp-header">
                <div className="tcp-header-left">
                    <Key size={26} className="tcp-icon" />
                    <div>
                        <h1>Teacher Registration Codes</h1>
                        <p>{unused.length} available · {used.length} used</p>
                    </div>
                </div>
                <div className="tcp-header-actions">
                    <button className="btn-refresh" onClick={loadCodes} title="Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn-generate" onClick={generateCode} disabled={isGenerating}>
                        <Plus size={16} />
                        {isGenerating ? 'Generating...' : 'Generate Code'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="tcp-error">{error} <button onClick={() => setError(null)}>✕</button></div>
            )}

            {codes.length === 0 ? (
                <div className="tcp-empty">
                    <Key size={40} />
                    <p>No codes yet. Generate one above.</p>
                </div>
            ) : (
                <>
                    {unused.length > 0 && (
                        <section className="tcp-section">
                            <h2 className="tcp-section-title">Available Codes</h2>
                            <div className="tcp-codes-grid">
                                {unused.map(c => (
                                    <div key={c.id} className="tcp-code-card available">
                                        <div className="tcp-code-value">{c.code}</div>
                                        <div className="tcp-code-meta">
                                            Created by {c.created_by_username || 'system'} · {new Date(c.created_at).toLocaleDateString()}
                                            {c.expires_at && ` · Expires ${new Date(c.expires_at).toLocaleDateString()}`}
                                        </div>
                                        <div className="tcp-code-actions">
                                            <button
                                                className="btn-copy"
                                                onClick={() => copyCode(c.code)}
                                                title="Copy code"
                                            >
                                                {copied === c.code ? <Check size={14} /> : <Copy size={14} />}
                                                {copied === c.code ? 'Copied!' : 'Copy'}
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => deleteCode(c.id)}
                                                title="Delete code"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {used.length > 0 && (
                        <section className="tcp-section">
                            <h2 className="tcp-section-title">Used Codes</h2>
                            <div className="tcp-codes-grid">
                                {used.map(c => (
                                    <div key={c.id} className="tcp-code-card used">
                                        <div className="tcp-code-value">{c.code}</div>
                                        <div className="tcp-code-meta">
                                            Used by <strong>{c.used_by_username || '?'}</strong>
                                        </div>
                                        <div className="tcp-code-actions">
                                            <button
                                                className="btn-delete"
                                                onClick={() => deleteCode(c.id)}
                                                title="Delete record"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};
