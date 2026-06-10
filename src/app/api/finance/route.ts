import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const PERIOD_DAYS: Record<string, number> = { hoje: 0, "7d": 7, "15d": 15, "30d": 30, tudo: -1 };

// conta leads/vendas do pipeline dentro do período (pela data de entrada do contato)
function metricsFromPipeline(period: string) {
  const days = PERIOD_DAYS[period] ?? 30;
  const cutoff = (() => {
    if (days < 0) return null;
    const d = new Date();
    if (days === 0) d.setHours(0, 0, 0, 0);
    else d.setDate(d.getDate() - days);
    return d;
  })();
  const inPeriod = (iso?: string) => (!cutoff ? true : iso ? new Date(iso) >= cutoff : false);
  const contacts = db.contacts.filter((c) => inPeriod(c.subscribedAt));

  const countByCol = (matcher: (n: string) => boolean) => {
    const ids = new Set(db.pipelineColumns.filter((c) => matcher(c.name.toLowerCase())).map((c) => c.id));
    return contacts.filter((c) => c.pipelineColumnId && ids.has(c.pipelineColumnId)).length;
  };
  const leads = contacts.length;
  const vendas = countByCol((n) => (n.includes("pagou") && !n.includes("não") && !n.includes("nao")) || n.includes("comprou") || n.includes("pago"));
  // enviados detectados no pipeline: colunas "agendado"/"enviado"/"postado"/"em transporte"
  // + os que já pagaram (também foram enviados). É o total que já saiu pra entrega (AfterPay).
  const enviadosPipeline =
    countByCol((n) => n.includes("agendad") || n.includes("enviad") || n.includes("postad") || n.includes("transporte") || n.includes("entrega")) + vendas;
  return { leads, vendas, enviadosPipeline };
}

export async function GET(req: NextRequest) {
  const period = new URL(req.url).searchParams.get("period") || "30d";
  const f = (db as any).finance || { trafficSpend: 0, productPrice: 0, productCost: 0, shippingCost: 0, shippedQty: 0 };
  const { leads, vendas, enviadosPipeline } = metricsFromPipeline(period);

  // ENVIADOS (AfterPay/COD): sempre puxado automaticamente do pipeline (agendados/enviados + pagos)
  const enviados = enviadosPipeline;
  // gasto de caixa com os ENVIOS (sai antes do pagamento no AfterPay)
  const gastoProdutoEnviado = enviados * (f.productCost || 0); // valor gasto comprando o produto enviado
  const gastoFreteEnviado = enviados * (f.shippingCost || 0); // valor gasto com frete dos envios
  const investidoLogistica = gastoProdutoEnviado + gastoFreteEnviado; // caixa investido em envios
  const aguardandoPagto = Math.max(0, enviados - vendas); // enviados que ainda não pagaram
  const valorEmRisco = aguardandoPagto * ((f.productCost || 0) + (f.shippingCost || 0)); // caixa parado/risco

  const receita = vendas * (f.productPrice || 0);
  const custoProduto = vendas * (f.productCost || 0);
  const custoFrete = vendas * (f.shippingCost || 0);
  const custoTotal = (f.trafficSpend || 0) + custoProduto + custoFrete;
  const lucro = receita - custoTotal;
  const roas = f.trafficSpend > 0 ? receita / f.trafficSpend : 0; // retorno sobre o investimento em ads
  const cpl = leads > 0 ? (f.trafficSpend || 0) / leads : 0; // custo por lead
  const cpa = vendas > 0 ? (f.trafficSpend || 0) / vendas : 0; // custo por venda (aquisição)
  const ticketMedio = f.productPrice || 0;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;
  const taxaConversao = leads > 0 ? (vendas / leads) * 100 : 0;

  return NextResponse.json({
    config: f,
    period,
    metrics: {
      leads, vendas, receita, custoProduto, custoFrete, custoTotal, lucro, roas, cpl, cpa, ticketMedio, margem, taxaConversao,
      enviados, gastoProdutoEnviado, gastoFreteEnviado, investidoLogistica, aguardandoPagto, valorEmRisco,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const f = (db as any).finance || ((db as any).finance = { trafficSpend: 0, productPrice: 0, productCost: 0, shippingCost: 0, shippedQty: 0 });
  for (const k of ["trafficSpend", "productPrice", "productCost", "shippingCost", "shippedQty"]) {
    if (body[k] != null && !isNaN(Number(body[k]))) f[k] = Number(body[k]);
  }
  return NextResponse.json({ ok: true, config: f });
}
