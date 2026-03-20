package com.cosmoserp.pos;

public class TenantResponse {
    private Data data;

    public Data getData() { return data; }

    public static class Data {
        private String businessName;
        private String tradingName;
        private String email;
        private String phone;
        private String logoUrl;
        private String kycStatus;

        public String getBusinessName() { return businessName; }
        public String getTradingName() { return tradingName; }
        public String getEmail() { return email; }
        public String getPhone() { return phone; }
        public String getLogoUrl() { return logoUrl; }
        public String getKycStatus() { return kycStatus; }
    }
}
