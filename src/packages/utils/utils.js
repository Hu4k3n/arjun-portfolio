export const onResume = () => {
    const RESUME_URL = 'https://drive.google.com/drive/folders/1Hzh_gnoERSSKut7Guy8KzvXpOCws7o83?usp=sharing';
        // Open the resume link in a new tab. Use noopener,noreferrer for security.
        window.open(RESUME_URL, '_blank', 'noopener,noreferrer');
    };
export const sendEmail = ({ to, subject, body }) => {
    console.log("Sending email to:", to);
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
};

export const getExp = () => new Date().getFullYear() - 2022;