import { API_KEY, API_URL } from "../../config/api"; /*src\modules\config\api.ts   ---  CHAVE RELATIVA DO CNOGIF API*/

export async function criarMaquina(dados: any) {
  const formData = new FormData();

  Object.keys(dados).forEach((key) => {
    if (key !== "foto") {
      formData.append(key, dados[key]);
    }
  });

  if (dados.foto) {
    formData.append("foto", {
      uri: dados.foto.uri,
      name: "foto.jpg",
      type: "image/jpeg",
    } as any);
  }

  const response = await fetch(`${API_URL}/maquinas`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Erro ao cadastrar máquina");
  }

  return response.json();
}
