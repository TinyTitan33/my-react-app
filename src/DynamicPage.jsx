import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UI_LABELS = {
  required: { en: "This field is required", fi: "Tämä kenttä on pakollinen" },
  too_short: { en: "Must be at least 3 characters", fi: "Vähintään 3 merkkiä vaaditaan" },
  out_of_range: { en: "Value is out of allowed range", fi: "Arvo on sallitun alueen ulkopuolella" },
  select_placeholder: { en: "-- Select --", fi: "-- Valitse --" },
  back: { en: "Back", fi: "Takaisin" },
  next: { en: "Next", fi: "Seuraava" },
  submit: { en: "Submit", fi: "Lähetä" },
  not_selected: { en: "Not selected", fi: "Ei valittu" },
  confirm_title: { en: "Review your answers", fi: "Tarkista vastauksesi" },
  confirm_msg: { en: "Please review your details. You can go back to edit anything.", fi: "Tarkista tietosi. Voit palata muokkaamaan mitä tahansa." },
  answered: { en: "answered", fi: "vastattua" },
  first_name: { en: "First Name", fi: "Etunimi" },
  last_name: { en: "Last Name", fi: "Sukunimi" },
  email: { en: "Email Address", fi: "Sähköpostiosoite" },
  product: { en: "Product", fi: "Tuote" },
  privacy_info: { 
    en: "I agree to the storage and processing of my personal data.", 
    fi: "Hyväksyn henkilötietojeni tallentamisen ja käsittelyn." 
  },
  privacy_required: {
    en: "You must agree to the data storage policy to submit.",
    fi: "Sinun on hyväksyttävä tietosuojakäytäntö lähettääksesi lomakkeen."
  }
};

function DynamicPage({ 
  pageData, 
  allPages, 
  lang, 
  onUpdate, 
  existingData, 
  nextPath, 
  prevPath, 
  isLastPage, 
  onSubmit, 
  getFieldDisplay, 
  getTotalAnswered 
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  
  // Track mandatory privacy checkbox on the last page
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState(false);

  const sortedFields = [...pageData.fields].sort((a, b) => a.order_field - b.order_field);
  const getFieldKey = (field) => `p${pageData.order_page}_f${field.order_field}`;

  useEffect(() => {
    const initialData = {};
    sortedFields.forEach(field => {
      const key = getFieldKey(field);
      if (existingData[key] !== undefined) initialData[key] = existingData[key];
      else initialData[key] = (field.type === 'checkbox' && !field.options) ? false : (field.type === 'checkbox' || field.type === 'fileUpload' ? [] : "");
    });
    setForm(initialData);
    setErrors({});
  }, [pageData, existingData]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const newErrors = {};
    sortedFields.forEach(field => {
      const key = getFieldKey(field);
      const value = form[key];

      if (field.required) {
        const isEmpty = (field.type === 'checkbox' && !field.options) ? value !== true : !value || (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          newErrors[key] = "required";
          return;
        }
      }

      if (field.required && (field.type === "text" || field.type === "textarea") && String(value).trim().length < 3) {
        newErrors[key] = "too_short";
      }

      if (field.type === "number" && value !== "" && value !== undefined) {
        const numVal = Number(value);
        const min = field.validation?.min ?? field.min;
        const max = field.validation?.max ?? field.max;
        
        if ((min !== undefined && numVal < min) || (max !== undefined && numVal > max)) {
          newErrors[key] = "out_of_range";
        }
      }
    });
    
    let isValid = Object.keys(newErrors).length === 0;

    // Validate the privacy checkbox if we are on the last page
    if (isLastPage && !privacyAccepted) {
      setPrivacyError(true);
      isValid = false;
    } else {
      setPrivacyError(false);
    }

    setErrors(newErrors);
    return isValid;
  };

  const getFieldStatusClass = (field, val, hasError) => {
    if (hasError) return "is-error";
    
    const isEmpty = val === "" || val === undefined || val === null || (Array.isArray(val) && val.length === 0) || (field.type === 'checkbox' && !field.options && val === false);
    if (isEmpty) return "is-empty";
    
    let isValid = true;
    if (field.type === "text" || field.type === "textarea") {
      if (String(val).trim().length < 3) isValid = false;
    } else if (field.type === "number") {
      const numVal = Number(val);
      const min = field.validation?.min ?? field.min;
      const max = field.validation?.max ?? field.max;
      if ((min !== undefined && numVal < min) || (max !== undefined && numVal > max)) isValid = false;
    }
    
    return isValid ? "is-filled" : "";
  };

  const renderField = (field) => {
    const key = getFieldKey(field);
    const val = form[key];
    const hasError = !!errors[key];

    const statusClass = getFieldStatusClass(field, val, hasError);
    const inputClass = `field-input ${statusClass}`.trim();

    switch (field.type) {
      case "text":
      case "number":
        const min = field.validation?.min ?? field.min;
        const max = field.validation?.max ?? field.max;
        const step = field.validation?.step ?? field.step;
        return (
          <input 
            className={inputClass} 
            type={field.type} 
            min={min} 
            max={max} 
            step={step}
            value={val !== undefined ? val : ""} 
            onChange={(e) => handleChange(key, e.target.value)} 
          />
        );
      case "textarea":
        return <textarea className={inputClass} rows={4} value={val || ""} onChange={(e) => handleChange(key, e.target.value)} />;
      case "dropdown":
        return (
          <select className={inputClass} value={val || ""} onChange={(e) => handleChange(key, e.target.value)}>
            <option value="">{UI_LABELS.select_placeholder[lang]}</option>
            {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label[lang]}</option>)}
          </select>
        );
      case "radio":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "10px 0" }}>
            {field.options?.map(opt => (
              <label key={opt.value} style={{ display: "flex", alignItems: "center", cursor: 'pointer', color: 'var(--text-main)' }}>
                <input type="radio" name={key} value={opt.value} checked={val === opt.value} onChange={(e) => handleChange(key, e.target.value)} style={{ marginRight: '10px' }} />
                {opt.label[lang]}
              </label>
            ))}
          </div>
        );
      case "checkbox":
        if (!field.options) {
          return (
            <label style={{ display: "flex", alignItems: "center", gap: "12px", margin: "10px 0", cursor: 'pointer' }}>
              <input type="checkbox" checked={!!val} onChange={(e) => handleChange(key, e.target.checked)} style={{ width: '22px', height: '22px' }} />
              <span style={{ color: 'var(--text-main)' }}>{field.label[lang]}</span>
            </label>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.options.map(opt => (
              <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: 'pointer' }}>
                <input type="checkbox" checked={Array.isArray(val) && val.includes(opt.value)} onChange={() => {
                  const current = Array.isArray(form[key]) ? form[key] : [];
                  const updated = current.includes(opt.value) ? current.filter(v => v !== opt.value) : [...current, opt.value];
                  handleChange(key, updated);
                }} style={{ width: '18px', height: '18px' }} />
                <span style={{ color: 'var(--text-main)' }}>{opt.label[lang]}</span>
              </label>
            ))}
          </div>
        );
      case "rating":
        return (
          <div className="rating-wrapper">
            <div className="star-container">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" className={`star-btn ${(val || 0) >= star ? 'active' : ''}`} onClick={() => handleChange(key, star)}>
                  <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                </button>
              ))}
            </div>
          </div>
        );
      case "nps":
        return (
          <div className="nps-wrapper">
            <div className="nps-container">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                <button 
                  key={score} 
                  type="button" 
                  style={{ "--nps-color": `var(--nps-${score})` }}
                  className={`nps-btn ${val === score ? 'selected' : ''}`} 
                  onClick={() => handleChange(key, score)}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        );
      case "fileUpload":
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="file" 
              multiple 
              style={{ color: 'var(--text-main)' }} 
              onChange={(e) => {
                const inputTarget = e.target; 
                const files = Array.from(inputTarget.files);
                if (!files.length) return;

                const existingFiles = Array.isArray(val) ? val : [];
                handleChange(key, [...existingFiles, ...files]);
                
                inputTarget.value = null; 
              }} 
            />
            
            {Array.isArray(val) && val.length > 0 && (
              <div style={{ fontSize: '0.85rem', color: '#4caf50', marginTop: '4px' }}>
                <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>Attached files (will upload on submit):</div>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {val.map((file, i) => (
                    <li key={i}>
                      {file instanceof File ? file.name : (typeof file === 'string' ? file.split('/').pop() : 'Attached file')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="form-container">
      
      {isLastPage && (
        <div style={{ marginBottom: "25px" }}>
          <div className="review-header-container">
            <div className="review-header-text">
              <h2>{UI_LABELS.confirm_title[lang]}</h2>
              <p>{UI_LABELS.confirm_msg[lang]}</p>
            </div>
            <div className="answered-badge">
              {getTotalAnswered()} {UI_LABELS.answered[lang]}
            </div>
          </div>

          <div className="review-list">
            {["first_name", "last_name", "email", "product"].map(
              (k) =>
                existingData[k] && (
                  <div key={k} className="review-row">
                    <div className="review-label">
                      {UI_LABELS[k] ? UI_LABELS[k][lang] : k.replace("_", " ")}
                    </div>
                    <div className="review-value">{existingData[k]}</div>
                  </div>
                )
            )}

            {Object.keys(existingData)
              .filter((k) => k.match(/^p\d+_f\d+$/))
              .filter((key) => {
                let isInfo = false;
                allPages.forEach((p) => {
                  const f = p.fields.find((field) => `p${p.order_page}_f${field.order_field}` === key);
                  if (f && f.type === "info") isInfo = true;
                });
                
                const isCurrentPage = key.startsWith(`p${pageData.order_page}_`);
                
                return !isInfo && !isCurrentPage;
              })
              .map((key) => {
                const display = getFieldDisplay(key, existingData[key]);
                return (
                  <div key={key} className="review-row">
                    <div className="review-label">{display.label}</div>
                    <div className="review-value">
                      {String(display.value)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {sortedFields.map(field => {
        const key = getFieldKey(field);
        return (
          <div key={key} className="field-group">
            {field.type !== "info" && !(field.type === "checkbox" && !field.options) && (
              <label className="field-label">
                {field.label[lang]} {field.required ? <span style={{ color: "#ff6b6b" }}>*</span> : ""}
              </label>
            )}
            {field.type === "info" && <p style={{ color: 'var(--text-main)', marginBottom: '10px' }}>{field.label[lang]}</p>}
            {field.helpText && <small className="help-text" style={{ marginBottom: "5px", display: "block" }}>{field.helpText[lang]}</small>}
            {renderField(field)}
            {errors[key] && (
              <p className="error-text">
                {UI_LABELS[errors[key]] ? UI_LABELS[errors[key]][lang] : errors[key]}
              </p>
            )}
          </div>
        );
      })}

      {/* Mandatory Privacy Checkbox for the final page */}
      {isLastPage && (
        <div className="field-group" style={{ 
          marginTop: "20px", 
          marginBottom: "15px", 
          padding: "15px", 
          backgroundColor: "var(--bg-input)", 
          borderRadius: "8px", 
          border: privacyError ? "2px solid #ff6b6b" : "1px solid var(--border-light)" 
        }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: 'pointer', margin: 0 }}>
            <input 
              type="checkbox" 
              checked={privacyAccepted}
              onChange={(e) => {
                setPrivacyAccepted(e.target.checked);
                if (e.target.checked) setPrivacyError(false);
              }} 
              style={{ width: '20px', height: '20px', marginTop: '2px', flexShrink: 0 }} 
            />
            <span style={{ color: 'var(--text-main)', fontSize: "0.9rem", lineHeight: "1.4" }}>
              {UI_LABELS.privacy_info[lang]} <span style={{ color: "#ff6b6b" }}>*</span>
            </span>
          </label>
          {privacyError && (
            <p className="error-text" style={{ marginTop: "8px", marginLeft: "32px" }}>
              {UI_LABELS.privacy_required[lang]}
            </p>
          )}
        </div>
      )}

      <div className="nav-buttons">
        <button onClick={() => navigate(prevPath)} disabled={!prevPath} className="back-button">
          <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          {UI_LABELS.back[lang]}
        </button>
        <button 
          onClick={() => validate() && (onUpdate(form), isLastPage ? onSubmit(form) : navigate(nextPath))} 
          className="next-button"
        >
          {isLastPage ? UI_LABELS.submit[lang] : UI_LABELS.next[lang]}
        </button>
      </div>
    </div>
  );
}

export default DynamicPage;