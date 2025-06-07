import React from 'react';
import { Helmet } from 'react-helmet';
import AnalyticsTestPanel from '@/components/analytics/AnalyticsTestPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Info } from 'lucide-react';

export default function GeminiTest() {
  return (
    <>
      <Helmet>
        <title>Test de Gemini AI | CRM</title>
        <meta name="description" content="Pruebas de integración con Gemini AI" />
      </Helmet>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Pruebas de Gemini AI</h1>
          <p className="text-gray-500">
            Esta página te permite probar las capacidades de inteligencia artificial de Gemini en tu CRM
          </p>
        </div>

        <Alert variant="default" className="bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle>Información</AlertTitle>
          <AlertDescription>
            El servicio utiliza Google Gemini Pro para realizar análisis inteligente sobre tus datos.
            Prueba las diferentes capacidades utilizando el panel a continuación.
          </AlertDescription>
        </Alert>

        <Card className="mt-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Capacidades disponibles
            </CardTitle>
            <CardDescription>
              Estas son algunas de las capacidades que puedes probar
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Generación de Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Genera tags inteligentes para cualquier texto como mensajes, descripciones o comentarios.
                  El sistema identificará categorías, sentimientos, y temas relevantes.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Predicción de Métricas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Obtén predicciones sobre el comportamiento futuro de las diferentes
                  métricas del negocio, como leads, conversiones y ventas.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Segmentación de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Agrupa a tus clientes en segmentos basados en patrones
                  de comportamiento y características similares.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Verificación del Servicio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Comprueba la disponibilidad y el estado del servicio de
                  inteligencia artificial de Google Gemini.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <AnalyticsTestPanel />
      </div>
    </>
  );
}