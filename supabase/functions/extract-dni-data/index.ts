import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frontImageBase64, backImageBase64 } = await req.json();
    
    if (!frontImageBase64 || !backImageBase64) {
      return new Response(
        JSON.stringify({ error: "Se requieren ambas imágenes del DNI (frente y dorso)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY no está configurada");
    }

    const systemPrompt = `Eres un experto en OCR y extracción de datos de documentos de identidad argentinos (DNI).

INSTRUCCIONES IMPORTANTES:
1. Analiza CUIDADOSAMENTE las imágenes del frente y dorso del DNI argentino
2. El DNI argentino tiene:
   - FRENTE: Foto, nombre completo, número de DNI, fecha de nacimiento, sexo
   - DORSO: Domicilio, huella, código de barras
3. Extrae TODOS los textos visibles en las imágenes
4. Los números de DNI argentinos tienen 7-8 dígitos

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin texto adicional):
{
  "dni_number": "número del DNI sin puntos (ej: 35534791)",
  "first_name": "nombres (ej: TOBIAS EZEQUIEL)",
  "last_name": "apellidos (ej: GONZALEZ)", 
  "birth_date": "fecha de nacimiento en formato YYYY-MM-DD",
  "gender": "M o F",
  "address": "domicilio completo del dorso"
}

IMPORTANTE: Lee el texto de las imágenes. Si ves texto, extráelo. Solo usa null si realmente no puedes leer un campo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae los datos de este DNI argentino. La primera imagen es el frente y la segunda es el dorso:" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${frontImageBase64}` } },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${backImageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intente nuevamente en unos minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Se requiere agregar créditos para continuar usando la IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Error al procesar las imágenes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "No se pudo extraer información del DNI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response
    let extractedData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(content);
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Error al interpretar los datos del DNI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
