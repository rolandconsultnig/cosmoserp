package com.cosmoserp.pos;

public class ReceiptActionRequest {
    private boolean sendEmail;
    private boolean sendWhatsApp;

    public ReceiptActionRequest(boolean sendEmail, boolean sendWhatsApp) {
        this.sendEmail = sendEmail;
        this.sendWhatsApp = sendWhatsApp;
    }
}
