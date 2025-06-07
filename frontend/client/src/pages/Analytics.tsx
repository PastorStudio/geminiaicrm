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
  Cell
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
  let startDate = new Date();
  
  switch (timeframe) {
    case "7days":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30days":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90days":
      startDate.setDate(now.getDate() - 90);
      break;
    case "lastYear":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      // "all" - just use a far past date
      startDate = new Date(2000, 0, 1);
  }
  
  return startDate.toISOString().split('T')[0];
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", 
  "#82CA9D", "#A4DE6C", "#D0ED57", "#83A6E0", "#8DD1E1"
];

export default function Analytics() {
  const [timeframe, setTimeframe] = useState("30days");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Parámetros para queries
  const startDate = getStartDateFromTimeframe(timeframe);
  const endDate = new Date().toISOString().split('T')[0];
  
  // Fetch all leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });
  
  // Fetch all activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });
  
  // Fetch all messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
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
    available: analyticsStatusData && 
               typeof analyticsStatusData === 'object' && 
               'success' in analyticsStatusData && 
               analyticsStatusData.success === true && 
               'status' in analyticsStatusData && 
               analyticsStatusData.status && 
               typeof analyticsStatusData.status === 'object' &&
               'available' in analyticsStatusData.status && 
               analyticsStatusData.status.available === true,
    message: analyticsStatusData && 
             typeof analyticsStatusData === 'object' && 
             'status' in analyticsStatusData && 
             analyticsStatusData.status && 
             typeof analyticsStatusData.status === 'object' && 'message' in analyticsStatusData.status ? 
             analyticsStatusData.status.message : 
             'Estado del servicio de análisis desconocido'
  };
  
  // Combined loading state for main data
  const isLoading = leadsLoading || activitiesLoading || messagesLoading || statsLoading;
  
  // Mock data for analytics visualizations
  const [leadsBySource, setLeadsBySource] = useState<any[]>([]);
  const [leadScoreDistribution, setLeadScoreDistribution] = useState<any[]>([]);
  const [messageEngagement, setMessageEngagement] = useState<any[]>([]);
  const [salesPerformance, setSalesPerformance] = useState<any[]>([]);
  
  useEffect(() => {
    if (!isLoading && leads && messages) {
      setLeadsBySource(calculateLeadsBySource(leads));
      setLeadScoreDistribution(calculateLeadScoreDistribution(leads));
      setMessageEngagement(calculateMessageEngagement(messages));
      setSalesPerformance(generateSalesPerformanceData(timeframe));
    }
  }, [leads, messages, timeframe, isLoading]);
  
  function formatStatus(status: string): string {
    switch (status) {
      case "new": return "Nuevo";
      case "contacted": return "Contactado";
      case "qualified": return "Calificado";
      case "proposal": return "Propuesta";
      case "negotiation": return "Negociación";
      case "won": return "Ganado";
      case "lost": return "Perdido";
      default: return status;
    }
  }
  
  function calculateLeadsBySource(leads: Lead[]) {
    const sources: Record<string, number> = {};
    
    leads.forEach(lead => {
      const source = lead.source || "Unknown";
      sources[source] = (sources[source] || 0) + 1;
    });
    
    return Object.keys(sources).map(source => ({
      name: source,
      value: sources[source]
    }));
  }
  
  function calculateLeadScoreDistribution(leads: Lead[]) {
    // Categorize leads by score ranges
    const ranges = [
      { name: "0-20", count: 0 },
      { name: "21-40", count: 0 },
      { name: "41-60", count: 0 },
      { name: "61-80", count: 0 },
      { name: "81-100", count: 0 }
    ];
    
    leads.forEach(lead => {
      // Utilizamos un valor default de 0 si score no existe
      // o asignamos un puntaje basado en la prioridad si existe
      let score = 0;
      if ('score' in lead) {
        score = (lead as any).score || 0;
      } else if (lead.priority) {
        switch (lead.priority.toLowerCase()) {
          case 'high': score = 80; break;
          case 'medium': score = 50; break;
          case 'low': score = 20; break;
          default: score = 0;
        }
      }
      
      if (score <= 20) ranges[0].count++;
      else if (score <= 40) ranges[1].count++;
      else if (score <= 60) ranges[2].count++;
      else if (score <= 80) ranges[3].count++;
      else ranges[4].count++;
    });
    
    return ranges;
  }
  
  function calculateMessageEngagement(messages: Message[]) {
    const engagement = [
      { name: "Abiertos", value: 0 },
      { name: "No abiertos", value: 0 },
      { name: "Respondidos", value: 0 }
    ];
    
    messages.forEach(message => {
      if (message.read) {
        engagement[0].value++;
        
        // Asumimos un 40% de respuesta para los mensajes leídos
        if (Math.random() > 0.6) {
          engagement[2].value++;
        }
      } else {
        engagement[1].value++;
      }
    });
    
    return engagement;
  }
  
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
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
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
            <BarChartIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Test Analytics Panel */}
      <AnalyticsTestPanel />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads Analytics</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "overview" ? (
        // OVERVIEW TAB CONTENT
        <>
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label
                          >
                            {leadsBySource.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Score Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Score Distribution</CardTitle>
                    <CardDescription>
                      Number of leads by quality score ranges
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={leadScoreDistribution}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#8884d8" name="Leads">
                            {leadScoreDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Sales Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Performance</CardTitle>
                    <CardDescription>
                      Lead generation and conversion trends over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={salesPerformance}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="leads"
                            name="New Leads"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="conversions" 
                            name="Conversions"
                            stroke="#82ca9d" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      ) : activeTab === "leads" ? (
        // LEADS ANALYTICS
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Analytics</CardTitle>
              <CardDescription>
                Detailed analysis of lead performance and conversion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Lead analytics content coming soon</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        // MESSAGING ANALYTICS
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Messaging Analytics</CardTitle>
              <CardDescription>
                Analysis of messaging performance and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Messaging analytics content coming soon</p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}