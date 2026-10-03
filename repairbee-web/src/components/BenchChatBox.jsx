import React, { useState, useRef, useEffect } from 'react';
import { useSocketChat } from '../hooks/useSocketChat';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Wifi, 
  WifiOff, 
  CheckCheck,
  ShieldCheck
} from 'lucide-react';

export default function BenchChatBox({
  orderId,
  chatType = 'customer_shop',
  token,
  currentUser,
  title = 'Direct Workbench Communicator',
  counterpartLabel = 'Bench Technician',
  height = '240px',
  compact = false,
  quickReplies = [],
}) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const {
    messages,
    isConnected,
    typingState,
    loadingHistory,
    uploadingMedia,
    sendMessage,
    sendTyping,
    uploadAttachment,
  } = useSocketChat({
    orderId,
    chatType,
    token,
    currentUser,
  });

  // Auto-scroll to bottom on new messages or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingState]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    let mediaUrl = null;
    if (selectedFile) {
      try {
        mediaUrl = await uploadAttachment(selectedFile);
        clearSelectedFile();
      } catch (err) {
        setUploadError('Failed to upload attachment. Please try again.');
        return;
      }
    }

    const textToSend = inputText.trim();
    setInputText('');
    sendTyping(false);
    await sendMessage(textToSend, mediaUrl);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      borderRadius: 'var(--radius-lg, 12px)',
      border: '1px solid var(--border-default, #e2e8f0)',
      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: compact ? '8px 12px' : '12px 16px',
        borderBottom: '1px solid var(--border-default, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? '#10b981' : '#f59e0b',
            boxShadow: isConnected ? '0 0 8px #10b981' : 'none',
          }} />
          <span style={{ fontSize: compact ? '12px' : '13px', fontWeight: 700, color: 'var(--secondary, #0f172a)' }}>
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: isConnected ? '#059669' : '#d97706' }}>
          {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span style={{ fontWeight: 600 }}>{isConnected ? 'Live Two-Way' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{
        height,
        overflowY: 'auto',
        padding: '12px 14px',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {loadingHistory ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px', gap: '6px' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Loading telemetry conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '0 20px' }}>
            <ShieldCheck size={28} style={{ color: '#cbd5e1', marginBottom: '6px' }} />
            <span>No messages yet. Direct encrypted channel with {counterpartLabel} is active.</span>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser?.id || m.sender === (currentUser?.role === 'customer' ? 'customer' : 'workshop');
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  fontSize: '10px',
                  color: '#64748b',
                  marginBottom: '2px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span>{isMe ? 'You' : (m.senderName || counterpartLabel)}</span>
                  {m.time && <span>• {m.time}</span>}
                </div>

                <div style={{
                  background: isMe ? '#d97706' : '#ffffff',
                  color: isMe ? '#ffffff' : '#0f172a',
                  padding: '8px 12px',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: compact ? '11px' : '12px',
                  border: isMe ? 'none' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                }}>
                  {/* Attached Media / Photo */}
                  {m.mediaUrl && (
                    <div style={{ marginBottom: m.text ? '6px' : '0' }}>
                      <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={m.mediaUrl}
                          alt="Attachment"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '160px',
                            borderRadius: '8px',
                            display: 'block',
                            objectFit: 'cover',
                            border: '1px solid rgba(0,0,0,0.1)',
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </a>
                    </div>
                  )}

                  {m.text && <div>{m.text}</div>}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingState && (
          <div style={{
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            padding: '4px 10px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            fontSize: '11px',
            color: '#64748b',
          }}>
            <span style={{ fontStyle: 'italic' }}>{typingState.userName || counterpartLabel} is typing</span>
            <span className="flex gap-1">
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block', margin: '0 2px' }} />
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Media Preview */}
      {selectedFile && (
        <div style={{
          padding: '6px 12px',
          background: '#f1f5f9',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            {filePreview ? (
              <img src={filePreview} alt="Preview" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />
            ) : (
              <ImageIcon size={18} color="#64748b" />
            )}
            <span style={{ fontSize: '11px', color: '#334155', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '200px' }}>
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={clearSelectedFile}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {uploadError && (
        <div style={{ padding: '4px 12px', background: '#fee2e2', color: '#b91c1c', fontSize: '11px' }}>
          {uploadError}
        </div>
      )}

      {/* Quick Canned Status Responses */}
      {quickReplies && quickReplies.length > 0 && (
        <div style={{
          padding: '6px 10px',
          background: '#f8fafc',
          borderTop: '1px solid var(--border-default, #e2e8f0)',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {quickReplies.map((qr, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendMessage(qr)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '3px 9px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.color = '#92400e'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#334155'; }}
            >
              {qr}
            </button>
          ))}
        </div>
      )}

      {/* Input / Action Form */}
      <form onSubmit={handleSend} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 10px',
        background: '#ffffff',
        borderTop: '1px solid var(--border-default, #e2e8f0)',
      }}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,video/mp4,application/pdf"
          onChange={handleFileSelect}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach diagnostic photo / schematic (stored in R2)"
          disabled={uploadingMedia}
          style={{
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '7px',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          <Paperclip size={15} />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={`Message ${counterpartLabel}...`}
          disabled={uploadingMedia}
          style={{
            flex: 1,
            height: compact ? '32px' : '36px',
            padding: '0 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: compact ? '11px' : '12px',
            outline: 'none',
            background: '#ffffff',
          }}
        />

        <button
          type="submit"
          disabled={uploadingMedia || (!inputText.trim() && !selectedFile)}
          style={{
            background: (!inputText.trim() && !selectedFile) ? '#cbd5e1' : '#d97706',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            height: compact ? '32px' : '36px',
            padding: '0 14px',
            fontSize: compact ? '11px' : '12px',
            fontWeight: 700,
            cursor: (!inputText.trim() && !selectedFile) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'background 0.2s',
          }}
        >
          {uploadingMedia ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <span>Send</span>
              <Send size={12} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
