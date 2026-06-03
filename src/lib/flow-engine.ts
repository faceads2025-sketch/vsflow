// Motor de execução de fluxos.
// Percorre os nodes a partir do node inicial e dispara as ações.
// Em modo mock as mensagens são enviadas via console (whatsapp.ts mock).

import type { Flow, FlowNode } from "./types";
import { sendText, sendMedia } from "./whatsapp";
import { enqueueSequenceStep } from "./queue";

function findStartNode(flow: Flow): FlowNode | undefined {
  const targets = new Set(flow.edges.map((e) => e.target));
  return flow.nodes.find((n) => !targets.has(n.id)) ?? flow.nodes[0];
}

function nextNodes(flow: Flow, nodeId: string, handle?: string): string[] {
  return flow.edges
    .filter((e) => e.source === nodeId && (handle ? e.sourceHandle === handle : true))
    .map((e) => e.target);
}

export interface FlowRunResult {
  steps: { nodeId: string; type: string; action: string }[];
}

// Executa o fluxo até encontrar um ponto de espera (pergunta/botões/transferência/fim).
export async function runFlow(
  flow: Flow,
  contact: { phone: string; name: string },
  startNodeId?: string,
): Promise<FlowRunResult> {
  const steps: FlowRunResult["steps"] = [];
  const visited = new Set<string>();
  let current: string | undefined = startNodeId ?? findStartNode(flow)?.id;

  while (current && !visited.has(current)) {
    visited.add(current);
    const node = flow.nodes.find((n) => n.id === current);
    if (!node) break;

    switch (node.type) {
      case "message":
        await sendText({ to: contact.phone, body: node.data.text || "" });
        steps.push({ nodeId: node.id, type: node.type, action: `mensagem enviada` });
        break;
      case "image":
      case "video":
      case "audio":
        await sendMedia({ to: contact.phone, type: node.type === "audio" ? "audio" : node.type, url: node.data.url || "", caption: node.data.caption });
        steps.push({ nodeId: node.id, type: node.type, action: `mídia (${node.type}) enviada` });
        break;
      case "delay":
        steps.push({ nodeId: node.id, type: node.type, action: `aguardar ${node.data.minutes || 0} min` });
        // num fluxo real: re-enfileira a continuação após o delay
        await enqueueSequenceStep({ contactId: contact.phone, sequenceId: flow.id, stepId: node.id, content: "" }, (node.data.minutes || 0) * 60000);
        break;
      case "tag":
        steps.push({ nodeId: node.id, type: node.type, action: `etiqueta aplicada: ${node.data.tag || ""}` });
        break;
      case "webhook":
        steps.push({ nodeId: node.id, type: node.type, action: `webhook -> ${node.data.url || ""}` });
        break;
      case "question":
        await sendText({ to: contact.phone, body: node.data.text || "" });
        steps.push({ nodeId: node.id, type: node.type, action: `pergunta enviada — aguardando resposta` });
        return { steps }; // espera input do usuário
      case "buttons":
        await sendText({ to: contact.phone, body: node.data.text || "" });
        steps.push({ nodeId: node.id, type: node.type, action: `botões enviados — aguardando escolha` });
        return { steps }; // espera escolha do usuário
      case "condition":
        steps.push({ nodeId: node.id, type: node.type, action: `condição avaliada` });
        break;
      case "transfer":
        steps.push({ nodeId: node.id, type: node.type, action: `transferido para atendente — automação pausada` });
        return { steps };
      case "randomizer":
        steps.push({ nodeId: node.id, type: node.type, action: `randomizador — caminho sorteado` });
        break;
      case "gpt":
        await sendText({ to: contact.phone, body: "[resposta gerada pela IA]" });
        steps.push({ nodeId: node.id, type: node.type, action: `assistente GPT respondeu` });
        break;
      case "end":
        steps.push({ nodeId: node.id, type: node.type, action: `fluxo finalizado` });
        return { steps };
    }

    const [next] = nextNodes(flow, current);
    current = next;
  }

  return { steps };
}
