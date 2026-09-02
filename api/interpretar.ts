export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { texto } = req.body ?? {};

    if (!texto || typeof texto !== "string") {
      return res.status(400).json({ error: "Falta el texto de búsqueda" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY no configurada en Vercel"
      });
    }

    const prompt = `
Sos el sistema de interpretación de búsqueda de una aplicación llamada Necesito...
La aplicación busca productos y servicios locales en Olavarría, Argentina.

Analizá la necesidad escrita por el usuario y devolvé SOLO JSON válido con esta estructura:

{
  "tipo": "producto" | "servicio" | "general",
  "rubro": "Ferretería" | "Plomería" | "Electricidad" | "Pintura" | "Carpintería" | "Mecánica" | "Cerrajería" | "Jardinería" | "Otros",
  "termino": "palabra o frase corta para buscar",
  "confianza": 0
}

Reglas:
- "termino" debe ser una búsqueda sencilla que pueda utilizar una aplicación.
- Si el usuario pide un profesional, usar tipo "servicio".
- Si pide una cosa para comprar, usar tipo "producto".
- Si no queda claro, usar "general".
- confianza debe ser un número entero entre 0 y 100.
- No agregues explicaciones fuera del JSON.

Consulta del usuario:
"${texto}"
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(502).json({
        error: "Error al consultar Gemini",
        details: errorText,
      });
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({
        error: "Gemini no devolvió una respuesta válida",
      });
    }

    let resultado;

    try {
      resultado = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "La respuesta de Gemini no fue JSON válido",
        raw: text,
      });
    }

    return res.status(200).json(resultado);

  } catch (error) {
    return res.status(500).json({
      error: "Error interno",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

