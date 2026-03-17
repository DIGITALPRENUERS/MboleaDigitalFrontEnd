export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validatePhone = (phone) => {
    const re = /^\+?[1-9]\d{1,14}$/;
    return re.test(phone.replace(/\s/g, ''));
};

export const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
};

export const validateUsername = (username) => {
    // 3-20 characters, alphanumeric and underscore
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
};

export const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '', colorClass: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;

    const levels = [
        { strength: 0, label: 'Very Weak', color: 'red', colorClass: 'bg-red-500' },
        { strength: 1, label: 'Weak', color: 'orange', colorClass: 'bg-orange-500' },
        { strength: 2, label: 'Fair', color: 'yellow', colorClass: 'bg-yellow-500' },
        { strength: 3, label: 'Good', color: 'blue', colorClass: 'bg-blue-500' },
        { strength: 4, label: 'Strong', color: 'green', colorClass: 'bg-green-500' },
    ];

    const level = levels[Math.min(strength - 1, 4)] || levels[0];
    return { ...level, strength };
};
