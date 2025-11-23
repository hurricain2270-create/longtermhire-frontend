import { useState, useEffect } from "react";
import { settingsApi } from "../services/settingsApi";

export const useCompanyLogo = () => {
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string>("Equipment Rental");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const response = await settingsApi.getPublicLogo();
                if (response && !response.error && response.data) {
                    setCompanyLogo(response.data.logo_url);
                    setCompanyName(response.data.company_name || "Equipment Rental");
                }
            } catch (error) {
                console.error("Failed to fetch company logo:", error);
                // Silently fail - will use fallback logo
            } finally {
                setLoading(false);
            }
        };

        fetchLogo();
    }, []);

    return { companyLogo, companyName, loading };
};
