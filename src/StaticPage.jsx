import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const STATIC_UI = {
  title: { en: "Contact Information", fi: "Yhteystiedot" },
  first_name: { en: "First Name", fi: "Etunimi" },
  last_name: { en: "Last Name", fi: "Sukunimi" },
  email: { en: "Email Address", fi: "Sähköpostiosoite" },
  product: { en: "Product", fi: "Tuote" },
  select_product: { en: "-- Select Product --", fi: "-- Valitse tuote --" },
  next: { en: "Next", fi: "Seuraava" },
  required: { en: "Required", fi: "Pakollinen" },
  invalid_email: { en: "Invalid email format", fi: "Virheellinen sähköpostiosoite" },
  only_letters: { en: "Only letters are allowed", fi: "Vain kirjaimet ovat sallittuja" },
  min_chars: { en: "Must be at least 2 characters", fi: "Vähintään 2 merkkiä vaaditaan" },
  verify_btn: { en: "Verify", fi: "Vahvista" },
  code_sent_msg: { en: "Enter the 6-digit code sent to your email", fi: "Syötä sähköpostiisi lähetetty 6-numeroinen koodi" },
  verify_code_btn: { en: "Submit Code", fi: "Lähetä koodi" },
  verified_success: { en: "✓ Email Verified", fi: "✓ Sähköposti vahvistettu" },
  resend: { en: "Resend", fi: "Lähetä uudelleen" },
  email_unverified: { en: "Please verify your email to continue", fi: "Vahvista sähköpostiosoitteesi jatkaaksesi" },
  incorrect_code: { en: "Incorrect code", fi: "Virheellinen koodi" },
  duplicate_email: { en: "You have already submitted this form for this campaign!", fi: "Olet jo lähettänyt vastauksen tähän kampanjaan tällä sähköpostiosoitteella!" }
};

export default function StaticPage({ products, lang, onUpdate, existingData, nextPath, campaign_db_id }) {
  const navigate = useNavigate();
  const campaignId = campaign_db_id;
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    product: "",
    email_verified: false,
    submToken: "" 
  });
  
  const [errors, setErrors] = useState({});

  const [verificationStatus, setVerificationStatus] = useState("idle"); 
  const [code, setCode] = useState(new Array(6).fill(""));
  const inputRefs = useRef([]);

  // status for error and success messages
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (existingData) {
      setFormData(prev => ({
        ...prev,
        first_name: existingData.first_name || "",
        last_name: existingData.last_name || "",
        email: existingData.email || "",
        product: existingData.product || "",
        submToken: existingData.submToken || ""
      }));
      if (existingData.email_verified) setVerificationStatus("verified");
    }
  }, [existingData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    
    if (name === "email") {
      // Reset verification state completely when the email value changes
      if (verificationStatus !== "idle") {
        setVerificationStatus("idle");
        setCode(new Array(6).fill(""));
        setErrorMessage("");
        setSuccessMessage("");
        setFormData(prev => ({ ...prev, email_verified: false, submToken: "" }));
      }
    }
  };

  const handleSendCode = async () => {
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      setErrors(prev => ({ ...prev, email: "invalid_email" }));
      return;
    }

    try {
      // Clear old messages and ensure we are in a clean state before sending
      setErrorMessage("");
      setSuccessMessage("");
      
      const response = await fetch("/api/webhook/semail-verif", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sec_id: campaignId,
          email: formData.email
        })
      });

      const data = await response.json(); 
    
      // Evaluate new backend JSON structure
      if (!response.ok || data.status === "error") {
        let errorText = data.message || "Failed to send verification email.";
        
        // Target the specific duplicate code here
        if (data.error?.code === "DUPLICATE_SUBMISSION") {
            errorText = STATIC_UI.duplicate_email[lang];
        } else if (data.error?.message) {
            errorText = data.error.message;
        }

        setErrorMessage(errorText); 
        setVerificationStatus("idle"); // Keep it idle so the code boxes do NOT show
        return;
      }

      // Success Path
      setVerificationStatus("sent");
      setCode(new Array(6).fill(""));
      setSuccessMessage(data.message || "Code sent successfully!"); 

      setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 100);

    } catch (err) {
      console.error("Failed to send verification email:", err);
      setErrorMessage("Network error occurred while trying to send the code.");
      setVerificationStatus("idle");
    }
  };

  const handleCodeChange = (element, index) => {
    if (isNaN(element.value)) return false; 
    const newCode = [...code];
    newCode[index] = element.value;
    setCode(newCode);
    
    if (verificationStatus === "code_error") {
      setVerificationStatus("sent");
    }

    if (element.value !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleCodeKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    
    // Extract only digits and limit to 6 characters
    const digits = pastedData.replace(/\D/g, "").slice(0, 6);
    
    if (digits) {
      const newCode = [...code];
      // Fill the boxes with the pasted digits
      for (let i = 0; i < newCode.length; i++) {
        newCode[i] = digits[i] || "";
      }
      setCode(newCode);
      
      if (verificationStatus === "code_error") {
        setVerificationStatus("sent");
      }

      // Auto-focus the next logical empty box, or the last box if completely filled
      const focusIndex = Math.min(digits.length, 5);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex].focus();
      }
    }
  };

  const handleVerifyCode = async () => {
    try {
      const enteredCode = Number(code.join(""));
      
      const response = await fetch("/api/webhook/semail-get-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.email,
          code: enteredCode
        })
      });

      const data = await response.json();

      if (response.ok && data.submToken && data.status !== "error") {
        setVerificationStatus("verified");
        setErrorMessage("");
        setFormData(prev => ({
          ...prev,
          email_verified: true,
          submToken: data.submToken   
        }));
        setErrors(prev => ({ ...prev, email: null }));
      } else {
        setVerificationStatus("code_error"); // Specific error state for the code input boxes
      }
    } catch (err) {
      console.error("Failed to verify code:", err);
      setVerificationStatus("code_error");
    }
  };

  const validate = () => {
    const newErrors = {};
    const { first_name, last_name, email, product } = formData;

    if (!first_name) newErrors.first_name = "required";
    else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(first_name)) newErrors.first_name = "only_letters";
    else if (first_name.trim().length < 2) newErrors.first_name = "min_chars";

    if (!last_name) newErrors.last_name = "required";
    else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(last_name)) newErrors.last_name = "only_letters";
    else if (last_name.trim().length < 2) newErrors.last_name = "min_chars";

    if (!email) {
      newErrors.email = "required";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "invalid_email";
    } else if (verificationStatus !== "verified") {
      newErrors.email = "email_unverified";
    }

    if (!product) newErrors.product = "required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onUpdate(formData);
      navigate(nextPath);
    }
  };

  const isFieldValid = (fieldName, value) => {
    if (!value || String(value).trim() === "") return false;
    
    switch (fieldName) {
      case "first_name":
      case "last_name":
        return /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(value) && value.trim().length >= 2;
      case "email":
        return /^\S+@\S+\.\S+$/.test(value);
      case "product":
        return !!value;
      default:
        return false;
    }
  };

  const getInputClass = (fieldName, value) => {
    if (errors[fieldName]) return "field-input is-error";
    if (!value || String(value).trim() === "") return "field-input is-empty";
    if (isFieldValid(fieldName, value)) return "field-input is-filled";
    return "field-input"; 
  };

  return (
    <div className="form-container">
      <h2 style={{ color: 'var(--text-main)', marginBottom: '20px' }}>
        {STATIC_UI.title[lang]}
      </h2>

      <div className="field-group">
        <label className="field-label">{STATIC_UI.first_name[lang]} <span style={{ color: "#ff6b6b" }}>*</span></label>
        <small className="help-text">Minimum 2 letters.</small>
        <input
          name="first_name"
          className={getInputClass("first_name", formData.first_name)}
          value={formData.first_name}
          onChange={handleChange}
        />
        {errors.first_name && <p className="error-text">{STATIC_UI[errors.first_name][lang]}</p>}
      </div>

      <div className="field-group">
        <label className="field-label">{STATIC_UI.last_name[lang]} <span style={{ color: "#ff6b6b" }}>*</span></label>
        <small className="help-text">Minimum 2 letters.</small>
        <input
          name="last_name"
          className={getInputClass("last_name", formData.last_name)}
          value={formData.last_name}
          onChange={handleChange}
        />
        {errors.last_name && <p className="error-text">{STATIC_UI[errors.last_name][lang]}</p>}
      </div>

      <div className="field-group">
        <label className="field-label">{STATIC_UI.email[lang]} <span style={{ color: "#ff6b6b" }}>*</span></label>
        <small className="help-text">Please enter a valid email address.</small>

        {errorMessage && (
          <div className="error-message" style={{ 
            color: "#ff6b6b", 
            margin: "10px 0", 
            padding: "8px", 
            backgroundColor: "rgba(255, 107, 107, 0.1)", 
            borderRadius: "4px" 
          }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="success-message" style={{ 
            color: "#2e7d32", 
            margin: "10px 0", 
            padding: "8px", 
            backgroundColor: "rgba(46, 125, 50, 0.1)", 
            borderRadius: "4px" 
          }}>
            {successMessage}
          </div>
        )}
        
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <input
            name="email"
            type="email"
            className={getInputClass("email", formData.email)}
            value={formData.email}
            onChange={handleChange}
            style={{ 
              backgroundColor: verificationStatus === "verified" ? "rgba(46, 125, 50, 0.05)" : "transparent",
              borderColor: verificationStatus === "verified" ? "#2e7d32" : ""
            }}
          />
          {verificationStatus === "idle" && (
            <button 
              type="button" 
              onClick={handleSendCode} 
              className="next-button" 
              style={{ height: "46px", padding: "0 20px", whiteSpace: "nowrap", marginBottom: "2px" }}
            >
              {STATIC_UI.verify_btn[lang]}
            </button>
          )}
        </div>
        
        {errors.email && <p className="error-text">{STATIC_UI[errors.email][lang]}</p>}

        {verificationStatus === "verified" && (
          <p style={{ color: "#2e7d32", fontWeight: "600", fontSize: "0.9rem", marginTop: "8px" }}>
            {STATIC_UI.verified_success[lang]}
          </p>
        )}

        {(verificationStatus === "sent" || verificationStatus === "code_error") && (
          <div style={{ 
            marginTop: "15px", padding: "15px", 
            backgroundColor: "var(--bg-body)", 
            border: "1px solid var(--border-light)", 
            borderRadius: "8px" 
          }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "var(--text-main)" }}>
              {STATIC_UI.code_sent_msg[lang]}
            </p>
            
            <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
              {code.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  ref={(el) => (inputRefs.current[index] = el)}
                  value={data}
                  onChange={(e) => handleCodeChange(e.target, index)}
                  onKeyDown={(e) => handleCodeKeyDown(e, index)}
                  onPaste={handleCodePaste}
                  onFocus={(e) => e.target.select()}
                  style={{
                    width: "36px", height: "45px", fontSize: "1.2rem", textAlign: "center",
                    borderRadius: "6px",
                    border: `2px solid ${verificationStatus === "code_error" ? "#ff6b6b" : "var(--border-color)"}`,
                    backgroundColor: "var(--bg-input)", color: "var(--text-main)", outline: "none"
                  }}
                />
              ))}
            </div>

            {verificationStatus === "code_error" && (
              <p style={{ color: "#ff6b6b", margin: "-5px 0 10px 0", fontSize: "0.85rem" }}>
                {STATIC_UI.incorrect_code[lang]}
              </p>
            )}

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button 
                type="button"
                className="next-button" 
                onClick={handleVerifyCode} 
                disabled={code.join("").length !== 6}
                style={{ height: "38px", padding: "0 20px", opacity: code.join("").length !== 6 ? 0.5 : 1 }}
              >
                {STATIC_UI.verify_code_btn[lang]}
              </button>
              <button 
                type="button"
                onClick={handleSendCode} 
                style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", textDecoration: "underline", fontSize: "0.9rem" }}
              >
                {STATIC_UI.resend[lang]}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="field-group">
        <label className="field-label">{STATIC_UI.product[lang]} <span style={{ color: "#ff6b6b" }}>*</span></label>
        <small className="help-text">Select the car/service you tested.</small>
        <select
          name="product"
          className={getInputClass("product", formData.product)}
          value={formData.product}
          onChange={handleChange}
        >
          <option value="">{STATIC_UI.select_product[lang]}</option>
          {products && products.map(p => (
            <option key={p.db_id} value={p.name.en}>
              {p.name[lang]}
            </option>
          ))}
        </select>
        {errors.product && <p className="error-text">{STATIC_UI[errors.product][lang]}</p>}
      </div>

      <div className="nav-buttons" style={{ justifyContent: 'flex-end' }}>
        <button className="next-button" onClick={handleNext}>
          {STATIC_UI.next[lang]}
        </button>
      </div>
    </div>
  );
}