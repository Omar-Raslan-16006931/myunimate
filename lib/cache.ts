export const cacheData = (key: string, data: any) => {
    localStorage.setItem(`unimate_${key}`, JSON.stringify(data));
};

export const getCachedData = (key: string) => {
    const data = localStorage.getItem(`unimate_${key}`);
    return data ? JSON.parse(data) : null;
};
