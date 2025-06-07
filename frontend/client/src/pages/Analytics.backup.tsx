import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead, Activity, Message, DashboardStats } from "@shared/schema";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AnalyticsTestPanel from "@/components/analytics/AnalyticsTestPanel";

// Helper function to get start date from timeframe
function getStartDateFromTimeframe(timeframe: string): string {
  const now = new Date();
  let date = new Date(now);
  
  switch (timeframe) {
    case '7days':
      date.setDate(date.getDate() - 7);
      break;
    case '30days':
      date.setDate(date.getDate() - 30);
      break;
    case '90days':
      date.setDate(date.getDate() - 90);
      break;
    default:
      date.setDate(date.getDate() - 30);
  }
  
  return date.toISOString().split('T')[0];
}

export default function Analytics() {
  const [timeframe, setTimeframe] = useState("30days");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Parámetros para queries
  const startDate = getStartDateFromTimeframe(timeframe);
  const endDate = new Date().toISOString().split('T')[0];
  
  // Fetch all leads
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });
  
  // Fetch all activities
  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });
  
  // Fetch all messages
  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", { recent: true, limit: 1000 }],
  });
  
  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard-stats"],
  });
  
  // Fetch analytic service status
  const { data: analyticsStatusData } = useQuery({
    queryKey: ["/api/analytics/status"],
    refetchOnWindowFocus: false
  });
  
  // Extraer propiedades del status con seguridad
  const analyticsStatus = {
    available: analyticsStatusData?.success && analyticsStatusData?.status?.available === true,
    message: analyticsStatusData?.status?.message || 'Estado del servicio de análisis desconocido'
  };
  
  // Fetch insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/analytics/insights", { startDate, endDate }],
    enabled: analyticsStatus.available,
    refetchOnWindowFocus: false
  });
  
  // Fetch lead conversion predictions
  const { data: leadConversions, isLoading: leadConversionsLoading } = useQuery({
    queryKey: ["/api/analytics/leads/conversion"],
    enabled: analyticsStatus.available,
    refetchOnWindowFocus: false
  });
  
  // Fetch customer feedback analysis
  const { data: customerFeedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ["/api/analytics/feedback", { startDate, endDate }],
    enabled: analyticsStatus.available && activeTab === "advanced",
    refetchOnWindowFocus: false
  });
  
  // Fetch customer segmentation
  const { data: customerSegments, isLoading: segmentsLoading } = useQuery({
    queryKey: ["/api/analytics/segments"],
    enabled: analyticsStatus.available && activeTab === "advanced",
    refetchOnWindowFocus: false
  });
  
  const isLoading = leadsLoading || activitiesLoading || messagesLoading || statsLoading;
  const isAdvancedLoading = insightsLoading || leadConversionsLoading || feedbackLoading || segmentsLoading;

  // Calculate leads by source
  const leadsBySource = leads ? calculateLeadsBySource(leads) : [];
  
  // Calculate leads by status 
  const leadsByStatus = 
    (dashboardStats && 'leadsByStatus' in dashboardStats && dashboardStats.leadsByStatus) ? 
      Object.entries(dashboardStats.leadsByStatus as Record<string, number>).map(([status, count]) => ({
        name: formatStatus(status),
        value: count,
      })) 
    : 
      // Generar datos de ejemplo basados en leads disponibles si leadsByStatus no existe
      leads ? 
        Array.from(new Set(leads.map(lead => lead.status || 'unknown')))
          .map(status => ({
            name: formatStatus(status),
            value: leads.filter(lead => (lead.status || 'unknown') === status).length
          }))
      : [];
  
  // Calculate sales performance over time (mock data for now)
  const salesPerformance = generateSalesPerformanceData(timeframe);
  
  // Calculate lead score distribution
  const leadScoreDistribution = leads ? calculateLeadScoreDistribution(leads) : [];
  
  // Calculate message engagement
  const messageEngagement = messages ? calculateMessageEngagement(messages) : [];

  // Chart colors
  const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

  // Helper function to format status
  function formatStatus(status: string): string {
    if (!status) return 'Unknown';
    
    switch (status) {
      case 'new': return 'New';
      case 'contacted': return 'Contacted';
      case 'meeting': return 'Meeting';
      case 'closed-won': return 'Won';
      case 'closed-lost': return 'Lost';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  // Calculate leads by source
  function calculateLeadsBySource(leads: Lead[]) {
    const sourceMap = new Map<string, number>();
    
    leads.forEach(lead => {
      const source = lead.source || 'Unknown';
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });
    
    const totalLeads = leads.length;
    
    return Array.from(sourceMap.entries())
      .map(([source, count]) => ({
        name: source.charAt(0).toUpperCase() + source.slice(1),
        value: count,
        percentage: Math.round((count / totalLeads) * 100),
      }))
      .sort((a, b) => b.value - a.value);
  }

  // Calculate lead score distribution
  function calculateLeadScoreDistribution(leads: Lead[]) {
    const ranges = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ];
    
    // En lugar de usar lead.score (que no existe en la interfaz Lead),
    // vamos a calcular una puntuación simulada basada en otros datos
    leads.forEach(lead => {
      let score = 0;
      
      // Factores para calcular score
      if (lead.status === 'meeting') score += 40;
      else if (lead.status === 'contacted') score += 20;
      else if (lead.status === 'closed-won') score += 100;
      else if (lead.status === 'closed-lost') score += 5;
      else score += 10;
      
      // La prioridad afecta la puntuación
      if (lead.priority === 'high') score += 20;
      else if (lead.priority === 'medium') score += 10;
      
      // Normalizar score a 0-100
      score = Math.min(100, Math.max(0, score));
      
      const range = ranges.find(r => score >= r.min && score <= r.max);
      if (range) {
        range.count++;
      }
    });
    
    return ranges.map(r => ({
      name: r.range,
      value: r.count,
    }));
  }

  // Calculate message engagement
  function calculateMessageEngagement(messages: Message[]) {
    const channelMap = new Map<string, number>();
    
    messages.forEach(message => {
      const channel = message.channel || 'Unknown';
      channelMap.set(channel, (channelMap.get(channel) || 0) + 1);
    });
    
    return Array.from(channelMap.entries())
      .map(([channel, count]) => ({
        name: channel.charAt(0).toUpperCase() + channel.slice(1),
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  }

  // Generate mock sales performance data
  function generateSalesPerformanceData(timeframe: string) {
    const data = [];
    const now = new Date();
    let totalDays;
    
    switch (timeframe) {
      case '7days':
        totalDays = 7;
        break;
      case '30days':
        totalDays = 30;
        break;
      case '90days':
        totalDays = 90;
        break;
      default:
        totalDays = 30;
    }
    
    // Use the actual leads data we have, but distribute them over time
    const totalLeads = leads?.length || 0;
    const leadsPerDay = Math.max(1, Math.ceil(totalLeads / totalDays));
    
    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const leads = Math.floor(leadsPerDay * (0.8 + Math.random() * 0.4));
      const conversions = Math.floor(leads * (0.2 + Math.random() * 0.3));
      
      data.push({
        date: date.toISOString().split('T')[0],
        leads,
        conversions,
      });
    }
    
    return data;
  }

  return (
    <>
      <Helmet>
        <title>Analytics | GeminiCRM</title>
        <meta name="description" content="Analyze your CRM performance with detailed charts and metrics" />
      </Helmet>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:hidden">Analytics</h1>
          <p className="text-sm text-gray-500">
            Analyze your CRM performance and customer engagement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Timeframe:</span>
          <Select 
            value={timeframe} 
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <span className="material-icons mr-1 text-sm">download</span>
            Export
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Visión General</TabsTrigger>
          <TabsTrigger value="advanced">
            Analytics Avanzado
            {!analyticsStatus.available && (
              <Badge variant="outline" className="ml-2 text-amber-500 border-amber-200 bg-amber-50">
                Requiere API
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "overview" ? (
        // VISIÓN GENERAL
        <>
          {/* Panel de Prueba de Analytics */}
          <AnalyticsTestPanel />
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="animate-pulse h-6 bg-gray-200 rounded w-1/3 mb-1"></div>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="animate-pulse h-60 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Leads by Source */}
              <Card>
                <CardHeader>
                  <CardTitle>Leads by Source</CardTitle>
                  <CardDescription>
                    Distribution of leads by acquisition channel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leadsBySource}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                        >
                          {leadsBySource.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} leads`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Leads by Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Status</CardTitle>
                  <CardDescription>
                    Distribution of leads by sales pipeline stage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={leadsByStatus}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip formatter={(value) => [`${value} leads`, 'Count']} />
                        <Legend />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-6">
              {/* Sales Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales Performance</CardTitle>
                  <CardDescription>
                    Lead acquisition and conversion metrics over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={salesPerformance}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="leads" stroke="#3b82f6" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="conversions" stroke="#10b981" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lead Score Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Quality</CardTitle>
                  <CardDescription>
                    Distribution of lead scores (AI-generated)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={leadScoreDistribution}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} leads`, 'Count']} />
                        <Legend />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Message Engagement */}
              <Card>
                <CardHeader>
                  <CardTitle>Communication Channels</CardTitle>
                  <CardDescription>
                    Engagement across different messaging channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={messageEngagement}
                          innerRadius={0}
                          outerRadius={90}
                          paddingAngle={0}
                          dataKey="value"
                          nameKey="name"
                          label
                        >
                          {messageEngagement.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} messages`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )
      ) : (
        // ANALYTICS AVANZADO
        !analyticsStatus.available ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Configuración requerida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                El análisis avanzado con inteligencia artificial requiere configurar una clave API de Gemini. 
                Esta característica permite análisis predictivo, segmentación de clientes, y obtener insights basados en ML.
              </p>
              <Button>
                Configurar API en Ajustes
              </Button>
            </CardContent>
          </Card>
        ) : isAdvancedLoading ? (
          <div className="grid grid-cols-1 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="mb-4">
                <CardHeader>
                  <div className="animate-pulse h-6 bg-gray-200 rounded w-1/3 mb-1"></div>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse h-20 bg-gray-200 rounded mb-2"></div>
                  <div className="animate-pulse h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Insights y Recomendaciones */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Insights y Oportunidades
                </CardTitle>
                <CardDescription>
                  Descubre oportunidades basadas en análisis de IA de datos de tu CRM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights?.insights?.slice(0, 5).map((insight, idx) => (
                    <Alert key={idx} className={
                      insight.impact === 'high' ? 'border-red-200 bg-red-50' :
                      insight.impact === 'medium' ? 'border-amber-200 bg-amber-50' :
                      'border-blue-200 bg-blue-50'
                    }>
                      <div className="flex items-start">
                        {insight.type === 'opportunity' && <TrendingUp className="h-4 w-4 mr-2 text-green-500" />}
                        {insight.type === 'risk' && <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />}
                        {insight.type === 'trend' && <BarChartIcon className="h-4 w-4 mr-2 text-blue-500" />}
                        {insight.type === 'recommendation' && <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />}
                        <div>
                          <AlertTitle className="text-sm font-semibold">
                            {insight.title}
                            <Badge variant="outline" className="ml-2 text-xs" 
                              style={{ 
                                color: insight.impact === 'high' ? 'rgb(220 38 38)' : 
                                       insight.impact === 'medium' ? 'rgb(217 119 6)' : 
                                       'rgb(37 99 235)',
                                borderColor: insight.impact === 'high' ? 'rgb(254 202 202)' : 
                                             insight.impact === 'medium' ? 'rgb(254 215 170)' : 
                                             'rgb(219 234 254)',
                                backgroundColor: insight.impact === 'high' ? 'rgb(254 242 242)' : 
                                                 insight.impact === 'medium' ? 'rgb(255 247 237)' : 
                                                 'rgb(239 246 255)',
                              }}>
                              {insight.impact === 'high' ? 'Alto impacto' : 
                               insight.impact === 'medium' ? 'Impacto medio' : 
                               'Bajo impacto'}
                            </Badge>
                          </AlertTitle>
                          <AlertDescription className="text-xs mt-1">
                            {insight.description}
                          </AlertDescription>
                        </div>
                      </div>
                      {insight.actions && insight.actions.length > 0 && (
                        <div className="mt-2 pl-6">
                          <span className="text-xs font-semibold block mb-1">Acciones recomendadas:</span>
                          <ul className="text-xs list-disc pl-4 space-y-1">
                            {insight.actions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Predicción de Conversión de Leads */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-green-500" />
                  Predicción de Conversión de Leads
                </CardTitle>
                <CardDescription>
                  Probabilidades de conversión basadas en análisis ML
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="value" 
                        name="Valor potencial" 
                        unit="k"
                        domain={[0, 100]}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="probability" 
                        name="Probabilidad" 
                        unit="%" 
                        domain={[0, 100]}
                      />
                      <ZAxis 
                        type="number" 
                        dataKey="size" 
                        range={[50, 400]} 
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => {
                          if (name === 'Valor potencial') return [`${value}k`, name];
                          if (name === 'Probabilidad') return [`${value}%`, name];
                          return [value, name];
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border rounded shadow-sm">
                                <p className="font-semibold">{data.name}</p>
                                <p>Probabilidad: {data.probability}%</p>
                                <p>Valor potencial: ${data.value}k</p>
                                <p>Confianza: {data.confidence}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Scatter 
                        name="Leads" 
                        data={leadConversions?.predictions?.map(lead => ({
                          ...lead,
                          size: 20 + lead.probability / 2
                        })) || []} 
                        fill="#8884d8"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
              <CardFooter className="text-sm text-gray-500 pt-0">
                El tamaño de cada punto representa la probabilidad de conversión combinada con el valor potencial.
              </CardFooter>
            </Card>

            {/* Análisis de Sentimiento y Segmentación de Clientes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Análisis de Sentimiento */}
              <Card>
                <CardHeader>
                  <CardTitle>Análisis de Sentimiento</CardTitle>
                  <CardDescription>
                    Sentimiento de los mensajes de clientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={customerFeedback?.analysis?.sentiment || [
                            { name: 'Positivo', value: 0 },
                            { name: 'Neutro', value: 0 },
                            { name: 'Negativo', value: 0 }
                          ]}
                          innerRadius={60}
                          outerRadius={90}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#4ade80" /> {/* Positivo - verde */}
                          <Cell fill="#a3a3a3" /> {/* Neutro - gris */}
                          <Cell fill="#f87171" /> {/* Negativo - rojo */}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Segmentación de Clientes */}
              <Card>
                <CardHeader>
                  <CardTitle>Segmentación de Clientes</CardTitle>
                  <CardDescription>
                    Perfiles de clientes basados en comportamiento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart 
                        outerRadius={90} 
                        data={customerSegments?.segmentation?.categories || []}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} />
                        {customerSegments?.segmentation?.segments?.map((segment, index) => (
                          <Radar 
                            key={segment.name}
                            name={segment.name} 
                            dataKey={`values[${index}]`} 
                            stroke={COLORS[index % COLORS.length]} 
                            fill={COLORS[index % COLORS.length]} 
                            fillOpacity={0.3} 
                          />
                        ))}
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : (
        <div>
          {/* Contenido de otros tabs */}
        </div>
      )}
    </>
  );
}
