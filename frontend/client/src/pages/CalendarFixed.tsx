import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, isSameDay, parseISO } from "date-fns";
import { Activity } from "@shared/schema";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Query para obtener actividades
  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['/api/activities'],
    queryFn: () => fetch('/api/activities').then(res => res.json()).catch(() => [])
  });

  // Asegurar que activities sea siempre un array
  const activities = Array.isArray(activitiesData) ? activitiesData : [];

  return (
    <div className="p-6">
      <Helmet>
        <title>Calendar | GeminiCRM</title>
        <meta name="description" content="Schedule and manage meetings, calls, and other activities with your leads" />
      </Helmet>

      <div className="mb-6 flex justify-between items-baseline">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:hidden">Calendar</h1>
          <p className="text-sm text-gray-500">
            Schedule and manage your activities
          </p>
        </div>
        <Button className="bg-primary-600 hover:bg-primary-700 text-white">
          <span className="material-icons text-sm mr-1">add</span>
          New Activity
        </Button>
      </div>

      {/* Calendar con 3 meses: actual, siguiente, próximo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Mes actual */}
        <Card className="shadow-xl border-l-4 border-l-green-500 ring-2 ring-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <CardTitle className="flex items-center text-green-700">
              <span className="material-icons mr-2">event</span>
              Mes Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <CalendarComponent 
              className="w-full" 
              mode="single" 
              selected={selectedDate} 
              onSelect={(date) => date && setSelectedDate(date)}
              numberOfMonths={1}
              showOutsideDays={false}
              modifiers={{
                hasActivity: (date) => {
                  return activities.some((activity: Activity) => 
                    activity.scheduled && isSameDay(parseISO(activity.scheduled.toString()), date)
                  );
                }
              }}
              modifiersClassNames={{
                hasActivity: "has-activity relative before:absolute before:bottom-1 before:left-1/2 before:transform before:-translate-x-1/2 before:w-2 before:h-2 before:bg-green-500 before:rounded-full"
              }}
            />
          </CardContent>
        </Card>

        {/* Mes siguiente */}
        <Card className="shadow-lg border-l-4 border-l-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="flex items-center text-blue-700">
              <span className="material-icons mr-2">calendar_month</span>
              Mes Siguiente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <CalendarComponent 
              className="w-full" 
              mode="single" 
              selected={selectedDate} 
              onSelect={(date) => date && setSelectedDate(date)}
              numberOfMonths={1}
              month={new Date(new Date().setMonth(new Date().getMonth() + 1))}
              showOutsideDays={false}
              modifiers={{
                hasActivity: (date) => {
                  return activities.some((activity: Activity) => 
                    activity.scheduled && isSameDay(parseISO(activity.scheduled.toString()), date)
                  );
                }
              }}
              modifiersClassNames={{
                hasActivity: "has-activity relative before:absolute before:bottom-1 before:left-1/2 before:transform before:-translate-x-1/2 before:w-2 before:h-2 before:bg-blue-500 before:rounded-full"
              }}
            />
          </CardContent>
        </Card>

        {/* Mes próximo (mes +2) */}
        <Card className="shadow-lg border-l-4 border-l-purple-500">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardTitle className="flex items-center text-purple-700">
              <span className="material-icons mr-2">schedule</span>
              Mes Próximo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <CalendarComponent 
              className="w-full" 
              mode="single" 
              selected={selectedDate} 
              onSelect={(date) => date && setSelectedDate(date)}
              numberOfMonths={1}
              month={new Date(new Date().setMonth(new Date().getMonth() + 2))}
              showOutsideDays={false}
              modifiers={{
                hasActivity: (date) => {
                  return activities.some((activity: Activity) => 
                    activity.scheduled && isSameDay(parseISO(activity.scheduled.toString()), date)
                  );
                }
              }}
              modifiersClassNames={{
                hasActivity: "has-activity relative before:absolute before:bottom-1 before:left-1/2 before:transform before:-translate-x-1/2 before:w-2 before:h-2 before:bg-purple-500 before:rounded-full"
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sección de eventos para la fecha seleccionada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividades del día seleccionado */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Actividades para {format(selectedDate, "MMMM d, yyyy")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">
                <span className="text-gray-500">Cargando actividades...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {activities?.filter((activity: Activity) => 
                  activity.scheduled && isSameDay(parseISO(activity.scheduled.toString()), selectedDate)
                ).length === 0 ? (
                  <div className="text-center py-4">
                    <span className="text-gray-500">No hay actividades programadas para este día</span>
                  </div>
                ) : (
                  activities?.filter((activity: Activity) => 
                    activity.scheduled && isSameDay(parseISO(activity.scheduled.toString()), selectedDate)
                  ).map((activity: Activity) => (
                    <div key={activity.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{activity.type}</h4>
                          <p className="text-sm text-gray-600">{activity.notes}</p>
                          {activity.scheduled && (
                            <p className="text-xs text-gray-500">
                              {format(parseISO(activity.scheduled.toString()), "h:mm a")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas actividades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximas Actividades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activities?.slice(0, 5).map((activity: Activity) => (
                <div key={activity.id} className="p-2 border rounded">
                  <div className="text-sm font-medium">{activity.type}</div>
                  <div className="text-xs text-gray-500">
                    {activity.scheduled && format(parseISO(activity.scheduled.toString()), "MMM d, h:mm a")}
                  </div>
                </div>
              )) || (
                <div className="text-center py-4">
                  <span className="text-gray-500">No hay actividades próximas</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}