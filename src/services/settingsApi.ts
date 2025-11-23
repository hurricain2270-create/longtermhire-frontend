import api from "./api";

export const settingsApi = {
    // Get company settings (Admin only)
    getSettings: async () => {
        const response = await api.get("/v1/api/longtermhire/settings");
        return response.data;
    },

    // Update company settings (Admin only)
    updateSettings: async (data) => {
        const response = await api.put("/v1/api/longtermhire/settings", data);
        return response.data;
    },

    // Get company logo (Public - no auth required)
    getPublicLogo: async () => {
        const response = await api.get("/v1/api/public/longtermhire/company-logo");
        return response.data;
    },
};
