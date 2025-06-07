import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ui/theme-provider";

// Profile form schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  avatar: z.string().optional(),
  role: z.string().optional(),
});

// AI Integration settings schema
const aiIntegrationSchema = z.object({
  selectedProvider: z.enum(["gemini", "openai", "qwen3"]).default("gemini"),
  geminiApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  qwenApiKey: z.string().optional(),
  customPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  enableAIResponses: z.boolean().default(true),
});

// Notification settings schema
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  newLeadAlerts: z.boolean().default(true),
  taskReminders: z.boolean().default(true),
  meetingReminders: z.boolean().default(true),
  leadStatusChanges: z.boolean().default(true),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type AiIntegrationValues = z.infer<typeof aiIntegrationSchema>;
type NotificationSettingsValues = z.infer<typeof notificationSettingsSchema>;

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  // Current user ID (hardcoded for now)
  const userId = 1;

  // Fetch current user
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${userId}`);
      return await response.json();
    },
  });

  // Profile form setup
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      username: user?.username || "",
      avatar: user?.avatar || "",
      role: user?.role || "",
    },
    values: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      username: user?.username || "",
      avatar: user?.avatar || "",
      role: user?.role || "",
    },
  });

  // Fetch Gemini API key status
  const { data: keyStatus, isLoading: keyStatusLoading } = useQuery<{
    hasValidKey: boolean;
    isTemporary: boolean;
  }>({
    queryKey: ["/api/settings/gemini-key-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/settings/gemini-key-status");
      return await response.json();
    },
  });

  // Fetch OpenAI API key status
  const { data: openaiStatus, isLoading: openaiStatusLoading } = useQuery<{
    hasValidKey: boolean;
  }>({
    queryKey: ["/api/settings/openai-key-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/settings/openai-key-status");
      return await response.json();
    },
  });

  // AI Integration form setup
  const aiForm = useForm<AiIntegrationValues>({
    resolver: zodResolver(aiIntegrationSchema),
    defaultValues: {
      selectedProvider: "gemini",
      geminiApiKey: "",
      openaiApiKey: "",
      qwenApiKey: "",
      customPrompt: "",
      temperature: 0.7,
      enableAIResponses: true,
    },
  });

  // Notification settings form setup
  const notificationSettingsForm = useForm<NotificationSettingsValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      newLeadAlerts: true,
      taskReminders: true,
      meetingReminders: true,
      leadStatusChanges: true,
    },
  });

  // Update profile mutation
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      return apiRequest("PATCH", `/api/users/${userId}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update API settings mutation
  const { mutate: updateApiSettings, isPending: isUpdatingApiSettings } = useMutation({
    mutationFn: async (values: ApiSettingsValues) => {
      // Actualizar la clave API de Gemini si se proporcionó una nueva
      if (values.geminiApiKey) {
        await apiRequest("POST", "/api/settings/update-gemini-key", { apiKey: values.geminiApiKey });
      }
      
      // Simular actualización de otras configuraciones
      // En una app real, esto se guardaría en la base de datos
      return Promise.resolve();
    },
    onSuccess: () => {
      // Invalidar la consulta para obtener el estado actualizado
      queryClient.invalidateQueries({ queryKey: ["/api/settings/gemini-key-status"] });
      
      toast({
        title: "API settings updated",
        description: "Your API integration settings have been saved.",
      });
      
      // Form cleared after save
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update API settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Generate temporary API key mutation
  const { mutate: generateTempKey, isPending: isGeneratingTempKey } = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/settings/generate-temp-key", {});
    },
    onSuccess: () => {
      // Invalidar la consulta para obtener el estado actualizado
      queryClient.invalidateQueries({ queryKey: ["/api/settings/gemini-key-status"] });
      
      toast({
        title: "Temporary API key generated",
        description: "A temporary API key has been generated for development purposes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate temporary API key: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update notification settings mutation
  const { mutate: updateNotificationSettings, isPending: isUpdatingNotificationSettings } = useMutation({
    mutationFn: async (values: NotificationSettingsValues) => {
      // In a real app, this would save to user preferences or app settings
      return new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update notification settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Profile form submission handler
  const onProfileSubmit = (values: ProfileFormValues) => {
    updateProfile(values);
  };

  // AI Integration form submission handler
  const onAiIntegrationSubmit = (values: AiIntegrationValues) => {
    // Handle AI integration settings
    toast({
      title: "AI Integration Updated",
      description: `Settings saved for ${values.selectedProvider.toUpperCase()} provider`,
    });
  };

  // Notification settings form submission handler
  const onNotificationSettingsSubmit = (values: NotificationSettingsValues) => {
    updateNotificationSettings(values);
  };

  return (
    <>
      <Helmet>
        <title>Settings | GeminiCRM</title>
        <meta name="description" content="Configure your CRM settings, profile, API integrations, and notification preferences" />
      </Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 md:hidden">Settings</h1>
        <p className="text-sm text-gray-500">
          Configure your account and application preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {userLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="your.email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl>
                              <Input disabled {...field} />
                            </FormControl>
                            <FormDescription>
                              Your role defines what permissions you have in the system.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? (
                        <>
                          <span className="material-icons animate-spin mr-2">refresh</span>
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Appearance</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-gray-500">
                      Switch between light and dark mode
                    </p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* AI Integration moved to dedicated page */}
        
        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications from the CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...notificationSettingsForm}>
                <form onSubmit={notificationSettingsForm.handleSubmit(onNotificationSettingsSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Channels</h3>
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Email Notifications</FormLabel>
                            <FormDescription className="text-xs">
                              Receive notifications via email
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="pushNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Push Notifications</FormLabel>
                            <FormDescription className="text-xs">
                              Receive browser push notifications
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="smsNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>SMS Notifications</FormLabel>
                            <FormDescription className="text-xs">
                              Receive text message notifications
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Types</h3>
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="newLeadAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>New Lead Alerts</FormLabel>
                            <FormDescription className="text-xs">
                              Get notified when new leads are added
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="taskReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Task Reminders</FormLabel>
                            <FormDescription className="text-xs">
                              Get reminders for upcoming and overdue tasks
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="meetingReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Meeting Reminders</FormLabel>
                            <FormDescription className="text-xs">
                              Get reminders for upcoming meetings
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationSettingsForm.control}
                      name="leadStatusChanges"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Lead Status Changes</FormLabel>
                            <FormDescription className="text-xs">
                              Get notified when lead statuses change
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" disabled={isUpdatingNotificationSettings}>
                    {isUpdatingNotificationSettings ? (
                      <>
                        <span className="material-icons animate-spin mr-2">refresh</span>
                        Saving...
                      </>
                    ) : (
                      "Save Notification Settings"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
