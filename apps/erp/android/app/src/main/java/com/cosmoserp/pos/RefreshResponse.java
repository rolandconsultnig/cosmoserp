package com.cosmoserp.pos;

import com.google.gson.annotations.SerializedName;

public class RefreshResponse {
    @SerializedName("accessToken")
    private String accessToken;

    public String getAccessToken() { return accessToken; }
}
