
export const calculateAge = (birthDate: string): string => {
  if (!birthDate) return 'N/A';
  const birth = new Date(birthDate);
  const today = new Date();
  
  if (isNaN(birth.getTime())) return 'N/A';
  
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  
  if (years === 0) {
    if (months === 0) {
       const diff = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
       return `${diff} วัน`;
    }
    return `${months} เดือน`;
  }
  
  return `${years} ปี ${months > 0 ? `${months} เดือน` : ''}`;
};
