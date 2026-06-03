// Cliente da Shopee Open Platform API v2.
// Assinatura HMAC-SHA256, OAuth (autorizar loja), refresh de token, pedidos e rastreio.

import crypto from "crypto";
import { getConfig, saveConfig, type ShopeeConfig } from "./integration-config";

const HOST = process.env.SHOPEE_HOST || "https://partner.shopeemobile.com";

function cfg(): ShopeeConfig | undefined {
  return getConfig().shopee;
}

export function shopeeConfigured() {
  const c = cfg();
  return !!(c?.partnerId && c?.partnerKey);
}
export function shopeeAuthorized() {
  const c = cfg();
  return !!(c?.accessToken && c?.shopId);
}

function ts() {
  return Math.floor(Date.now() / 1000);
}

function hmac(key: string, base: string) {
  return crypto.createHmac("sha256", key).update(base).digest("hex");
}

// assinatura para APIs públicas (auth): partner_id + path + timestamp
function publicSign(path: string, t: number) {
  const c = cfg()!;
  return hmac(c.partnerKey, `${c.partnerId}${path}${t}`);
}
// assinatura para APIs de loja: partner_id + path + timestamp + access_token + shop_id
function shopSign(path: string, t: number, accessToken: string, shopId: string) {
  const c = cfg()!;
  return hmac(c.partnerKey, `${c.partnerId}${path}${t}${accessToken}${shopId}`);
}

// URL pra autorizar a loja (redireciona o lojista pro Shopee e volta no callback)
export function buildAuthUrl(redirect: string) {
  const c = cfg();
  if (!c?.partnerId || !c?.partnerKey) throw new Error("Configure partner_id e partner_key primeiro");
  const t = ts();
  const path = "/api/v2/shop/auth_partner";
  const sign = publicSign(path, t);
  return `${HOST}${path}?partner_id=${c.partnerId}&timestamp=${t}&sign=${sign}&redirect=${encodeURIComponent(redirect)}`;
}

// troca o code (do callback) por access_token + refresh_token
export async function exchangeCode(code: string, shopId: string) {
  const c = cfg()!;
  const t = ts();
  const path = "/api/v2/auth/token/get";
  const sign = publicSign(path, t);
  const res = await fetch(`${HOST}${path}?partner_id=${c.partnerId}&timestamp=${t}&sign=${sign}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, shop_id: Number(shopId), partner_id: Number(c.partnerId) }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Shopee auth: ${data.error} ${data.message || ""}`);
  saveConfig({
    shopee: {
      ...c,
      shopId: String(shopId),
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expireAt: Date.now() + (data.expire_in || 14400) * 1000,
    },
  });
  return data;
}

// garante um access_token válido (renova via refresh_token quando perto de expirar)
async function ensureToken(): Promise<ShopeeConfig> {
  const c = cfg();
  if (!c?.accessToken || !c?.shopId) throw new Error("Shopee não autorizado");
  if (Date.now() < c.expireAt - 60000) return c;

  const t = ts();
  const path = "/api/v2/auth/access_token/get";
  const sign = publicSign(path, t);
  const res = await fetch(`${HOST}${path}?partner_id=${c.partnerId}&timestamp=${t}&sign=${sign}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: c.refreshToken, shop_id: Number(c.shopId), partner_id: Number(c.partnerId) }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Shopee refresh: ${data.error} ${data.message || ""}`);
  const next: ShopeeConfig = {
    ...c,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || c.refreshToken,
    expireAt: Date.now() + (data.expire_in || 14400) * 1000,
  };
  saveConfig({ shopee: next });
  return next;
}

// GET assinado em API de loja
async function shopGet(path: string, params: Record<string, string> = {}) {
  const c = await ensureToken();
  const t = ts();
  const sign = shopSign(path, t, c.accessToken, c.shopId);
  const q = new URLSearchParams({
    partner_id: String(c.partnerId),
    timestamp: String(t),
    sign,
    access_token: c.accessToken,
    shop_id: String(c.shopId),
    ...params,
  });
  const res = await fetch(`${HOST}${path}?${q.toString()}`);
  const data = await res.json();
  if (data.error) throw new Error(`Shopee ${path}: ${data.error} ${data.message || ""}`);
  return data;
}

// lista pedidos (últimos 15 dias) + detalhes
export async function getOrders(orderStatus = "") {
  const now = ts();
  const from = now - 15 * 24 * 3600; // janela máx. de 15 dias
  const list = await shopGet("/api/v2/order/get_order_list", {
    time_range_field: "create_time",
    time_from: String(from),
    time_to: String(now),
    page_size: "50",
    ...(orderStatus ? { order_status: orderStatus } : {}),
  });
  const sns: string[] = (list.response?.order_list || []).map((o: any) => o.order_sn);
  if (!sns.length) return [];
  const detail = await shopGet("/api/v2/order/get_order_detail", {
    order_sn_list: sns.join(","),
    response_optional_fields: "buyer_username,total_amount,order_status,create_time,item_list,recipient_address,payment_method",
  });
  return (detail.response?.order_list || []).map((o: any) => ({
    orderSn: o.order_sn,
    status: o.order_status,
    buyer: o.buyer_username,
    total: o.total_amount,
    currency: o.currency || "",
    createTime: o.create_time,
    items: (o.item_list || []).map((i: any) => ({ name: i.item_name, qty: i.model_quantity_purchased })),
    recipient: o.recipient_address?.name,
    payment: o.payment_method,
  }));
}

// rastreio de um pedido
export async function getTracking(orderSn: string) {
  const data = await shopGet("/api/v2/logistics/get_tracking_number", { order_sn: orderSn });
  return data.response?.tracking_number || "";
}
