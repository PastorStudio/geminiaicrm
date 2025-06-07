import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DashboardStats as IDashboardStats } from "@shared/schema";
import { usePageTranslation } from "@/components/translation/PageTranslator";
import { useEffect, useState } from "react";
import { Users, TrendingUp, MessageCircle, Calendar } from "lucide-react";

export default function DashboardStats() {
  // Fetch dashboard stats (working endpoint)
  const { data: stats, isLoading } = useQuery<IDashboardStats>({
    queryKey: ["/api/dashboard-stats"]
  });

  // Fetch dashboard metrics for top cards (real database data)
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard-metrics"]
  });

  // Obtener el contexto de traducción
  const { currentLanguage, translatePage } = usePageTranslation();

  // Format conversion rate from performance metrics
  const formatConversionRate = (performanceMetrics?: any) => {
    if (!performanceMetrics?.conversionRate) return "0%";
    return performanceMetrics.conversionRate + "%";
  };

  // Get active conversations from active leads
  const getActiveConversations = () => {
    return stats?.activeLeads || 0;
  };

  // Get today's meetings from pending activities
  const getTodayMeetings = () => {
    return stats?.pendingActivities || 0;
  };

  // Traducciones estáticas para los títulos de widgets
  const staticTranslations = {
    'Total Leads': {
      en: 'Total Leads',
      es: 'Total Leads',
      pt: 'Total de Leads',
      fr: 'Total des Prospects',
      de: 'Gesamte Leads',
      it: 'Totale Lead',
      zh: '总线索',
      ja: '総リード数',
      ko: '총 리드',
      ru: 'Всего лидов',
      ar: 'إجمالي العملاء المحتملين'
    },
    'Conversion Rate': {
      en: 'Conversion Rate',
      es: 'Tasa de Conversión',
      pt: 'Taxa de Conversão',
      fr: 'Taux de Conversion',
      de: 'Konversionsrate',
      it: 'Tasso di Conversione',
      zh: '转化率',
      ja: 'コンバージョン率',
      ko: '전환율',
      ru: 'Коэффициент конверсии',
      ar: 'معدل التحويل'
    },
    'Active Conversations': {
      en: 'Active Conversations',
      es: 'Conversaciones Activas',
      pt: 'Conversas Ativas',
      fr: 'Conversations Actives',
      de: 'Aktive Gespräche',
      it: 'Conversazioni Attive',
      zh: '活跃对话',
      ja: 'アクティブな会話',
      ko: '활성 대화',
      ru: 'Активные разговоры',
      ar: 'المحادثات النشطة'
    },
    "Today's Meetings": {
      en: "Today's Meetings",
      es: 'Reuniones de Hoy',
      pt: 'Reuniões de Hoje',
      fr: "Réunions d'Aujourd'hui",
      de: 'Heutige Besprechungen',
      it: "Riunioni di Oggi",
      zh: '今日会议',
      ja: '今日の会議',
      ko: '오늘의 회의',
      ru: 'Сегодняшние встречи',
      ar: 'اجتماعات اليوم'
    }
  };

  // Get translated widget titles
  const getTranslatedTitles = () => {
    return {
      totalLeads: staticTranslations['Total Leads'][currentLanguage as keyof typeof staticTranslations['Total Leads']] || 'Total Leads',
      conversionRate: staticTranslations['Conversion Rate'][currentLanguage as keyof typeof staticTranslations['Conversion Rate']] || 'Conversion Rate',
      activeConversations: staticTranslations['Active Conversations'][currentLanguage as keyof typeof staticTranslations['Active Conversations']] || 'Active Conversations',
      todayMeetings: staticTranslations["Today's Meetings"][currentLanguage as keyof typeof staticTranslations["Today's Meetings"]] || "Today's Meetings"
    };
  };

  // State for translated titles
  const [translatedTitles, setTranslatedTitles] = useState(getTranslatedTitles());

  // Update translated titles when language changes
  useEffect(() => {
    setTranslatedTitles(getTranslatedTitles());
  }, [currentLanguage]);

  return (
    <TooltipProvider>
      <div className="dashboard-stats mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Leads */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Users className="h-6 w-6 text-primary-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total number of leads in the system</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {translatedTitles.totalLeads}
                  </dt>
                  <dd className="flex items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {(stats?.totalLeads || 0).toLocaleString()}
                      </div>
                    )}
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      8.2%
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Conversion rate percentage</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {translatedTitles.conversionRate}
                  </dt>
                  <dd className="flex items-baseline">
                    {metricsLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {(metrics?.conversionRate || 0).toFixed(1)}%
                      </div>
                    )}
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      +{(metrics?.newLeadsThisMonth || 0)}
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Conversations */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MessageCircle className="h-6 w-6 text-blue-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Active conversations count</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {translatedTitles.activeConversations}
                  </dt>
                  <dd className="flex items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {(stats?.totalMessages || 0).toLocaleString()}
                      </div>
                    )}
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-blue-600">
                      WhatsApp
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Meetings */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Today's scheduled meetings</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {translatedTitles.todayMeetings}
                  </dt>
                  <dd className="flex items-baseline">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {(stats?.totalTickets || 0).toLocaleString()}
                      </div>
                    )}
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-purple-600">
                      Tickets
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
