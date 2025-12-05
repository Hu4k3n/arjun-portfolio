export const onResume = () => {
    const RESUME_URL = 'https://drive.google.com/drive/folders/1Hzh_gnoERSSKut7Guy8KzvXpOCws7o83?usp=sharing';
        // Open the resume link in a new tab. Use noopener,noreferrer for security.
        openLink(RESUME_URL);
    };

export const openLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
}

export const getExp = () => new Date().getFullYear() - 2022;