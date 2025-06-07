import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

export default function UpcomingActivities() {
  // Fetch upcoming activities for the current user (using a hardcoded ID for now)
  const userId = 1; // Current user ID
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities", { userId, upcoming: true }],
    queryFn: async () => {
      const response = await fetch(`/api/activities?userId=${userId}&upcoming=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    }
  });

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return { icon: "videocam", color: "bg-primary-100 text-primary-600" };
      case "call":
        return { icon: "call", color: "bg-green-100 text-green-600" };
      case "email":
        return { icon: "email", color: "bg-purple-100 text-purple-600" };
      case "task":
        return { icon: "assignment", color: "bg-orange-100 text-orange-600" };
      default:
        return { icon: "event", color: "bg-gray-100 text-gray-600" };
    }
  };

  // Format date ranges for display
  const formatDateRange = (startTime?: Date | string, endTime?: Date | string) => {
    if (!startTime) return "No date set";
    
    const start = new Date(startTime);
    const today = new Date();
    const isToday = start.toDateString() === today.toDateString();
    const isTomorrow = 
      new Date(today.setDate(today.getDate() + 1)).toDateString() === 
      start.toDateString();
    
    const timeString = format(start, "h:mm a");
    let datePrefix = format(start, "MMM d");
    
    if (isToday) datePrefix = "Today";
    if (isTomorrow) datePrefix = "Tomorrow";
    
    if (!endTime) return `${datePrefix}, ${timeString}`;
    
    const end = new Date(endTime);
    const endTimeString = format(end, "h:mm a");
    
    return `${datePrefix}, ${timeString} - ${endTimeString}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 py-5 sm:px-6">
        <div>
          <CardTitle className="text-lg">Upcoming Activities</CardTitle>
          <CardDescription>
            Scheduled meetings and follow-ups
          </CardDescription>
        </div>
        <Button variant="link" className="text-primary-600 flex items-center p-0">
          <span className="material-icons mr-1">calendar_today</span>
          <span className="text-sm">View Calendar</span>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="animate-pulse space-y-4 p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {activities.map((activity) => {
                const { icon, color } = getActivityIcon(activity.type);
                return (
                  <li key={activity.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`rounded-full p-2 mr-4 ${color}`}>
                            <span className="material-icons">{icon}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                            <p className="text-sm text-gray-500">
                              {formatDateRange(activity.startTime, activity.endTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex">
                          <Button variant="ghost" size="sm" className="mr-2">
                            <span className="material-icons text-gray-400">edit</span>
                          </Button>
                          <Button variant="ghost" size="sm">
                            <span className="material-icons text-gray-400">more_vert</span>
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <span className="material-icons text-sm mr-1">person</span>
                            {activity.aiGenerated ? "AI Generated" : "You"}
                          </p>
                          {activity.leadId && (
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              <span className="material-icons text-sm mr-1">business</span>
                              Lead #{activity.leadId}
                            </p>
                          )}
                        </div>
                        {activity.aiGenerated && (
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <span className="material-icons text-sm mr-1">auto_awesome</span>
                            <p>AI Prepared</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No upcoming activities scheduled
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
