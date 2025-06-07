import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Lead } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, isToday, isTomorrow, isBefore, addDays } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGemini } from "@/hooks/useGemini";

// Task form schema
const taskFormSchema = z.object({
  leadId: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.date().optional(),
  type: z.literal("task"),
  completed: z.boolean().default(false),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export default function Tasks() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Activity | null>(null);
  const { toast } = useToast();
  const { generateMessage } = useGemini();
  
  // Current user ID (hardcoded for now)
  const userId = 1;

  // Fetch all tasks for the current user
  const { data: allTasks, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities", { userId, type: "task" }],
  });

  // Fetch all leads (for the select dropdown)
  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Form setup
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "task", // Always task for this page
      completed: false,
    },
  });

  // Reset form when opening the modal
  const openTaskModal = (task?: Activity) => {
    if (task) {
      // Edit existing task
      form.reset({
        leadId: task.leadId,
        title: task.title,
        description: task.description || "",
        startTime: task.startTime ? new Date(task.startTime) : undefined,
        type: "task",
        completed: task.completed || false,
      });
      setEditingTask(task);
    } else {
      // Create new task
      form.reset({
        title: "",
        description: "",
        type: "task",
        completed: false,
      });
      setEditingTask(null);
    }
    setIsCreatingTask(true);
  };

  // Create or update task mutation
  const { mutate: saveTask, isPending } = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      const taskData = {
        ...values,
        userId, // Current user
        createdBy: userId,
      };
      
      if (editingTask) {
        // Update existing task
        return apiRequest("PATCH", `/api/activities/${editingTask.id}`, taskData);
      } else {
        // Create new task
        return apiRequest("POST", "/api/activities", taskData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: editingTask ? "Task updated" : "Task created",
        description: `Your task has been ${editingTask ? "updated" : "created"} successfully.`,
      });
      setIsCreatingTask(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingTask ? "update" : "create"} task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const { mutate: deleteTask, isPending: isDeleting } = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("DELETE", `/api/activities/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Task deleted",
        description: "The task has been removed from your list.",
      });
      setIsCreatingTask(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Toggle task completion mutation
  const { mutate: toggleTaskCompletion } = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: number; completed: boolean }) => {
      return apiRequest("PATCH", `/api/activities/${taskId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update task status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: TaskFormValues) => {
    saveTask(values);
  };

  // Filter tasks based on selected tab and search term
  const filteredTasks = allTasks?.filter(task => {
    const matchesSearch = 
      !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    switch (selectedTab) {
      case "today":
        return task.startTime && isToday(new Date(task.startTime));
      case "upcoming":
        return task.startTime && 
          !isToday(new Date(task.startTime)) && 
          !task.completed;
      case "completed":
        return task.completed;
      case "overdue":
        return task.startTime && 
          isBefore(new Date(task.startTime), new Date()) && 
          !task.completed;
      default: // "all"
        return true;
    }
  });

  // Format due date for display
  const formatDueDate = (date?: Date | string) => {
    if (!date) return "No due date";
    
    const dueDate = typeof date === "string" ? new Date(date) : date;
    
    if (isToday(dueDate)) return "Today";
    if (isTomorrow(dueDate)) return "Tomorrow";
    
    return format(dueDate, "MMM d, yyyy");
  };

  // Generate a task using Gemini
  const handleGenerateTaskWithAI = async () => {
    try {
      // For demonstration, we're using the generateMessage function
      // In a real implementation, this would be a separate endpoint specifically for tasks
      const generatedContent = await generateMessage(0, "task");
      
      form.setValue("title", generatedContent.split("\n")[0] || "Follow up with lead");
      form.setValue("description", generatedContent.split("\n").slice(1).join("\n") || "");
      
      toast({
        title: "Task generated",
        description: "AI has suggested a task based on your CRM data",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate task with AI",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Tasks | GeminiCRM</title>
        <meta name="description" content="Manage your tasks and to-dos related to your leads and customers" />
      </Helmet>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:hidden">Tasks</h1>
          <p className="text-sm text-gray-500">
            Track and manage your tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleGenerateTaskWithAI}
            className="flex items-center"
          >
            <span className="material-icons text-sm mr-1">auto_awesome</span>
            AI Suggest
          </Button>
          <Button 
            className="bg-primary-600 hover:bg-primary-700 text-white"
            onClick={() => openTaskModal()}
          >
            <span className="material-icons text-sm mr-1">add</span>
            New Task
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="mt-3">
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : filteredTasks?.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <span className="material-icons text-4xl mb-2">check_circle</span>
              <p className="font-medium">No tasks found</p>
              <p className="text-sm">
                {selectedTab === "completed" 
                  ? "You haven't completed any tasks yet" 
                  : "Add a new task to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks?.map((task) => (
                <div 
                  key={task.id} 
                  className={`p-3 border rounded-md flex items-start hover:bg-gray-50 ${
                    task.completed ? "bg-gray-50" : ""
                  }`}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(checked) => {
                      toggleTaskCompletion({ 
                        taskId: task.id, 
                        completed: checked as boolean 
                      });
                    }}
                    className="mt-1 mr-3"
                  />
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => openTaskModal(task)}
                  >
                    <h4 className={`font-medium ${task.completed ? "line-through text-gray-500" : ""}`}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      {task.startTime && (
                        <div className="flex items-center mr-3">
                          <span className="material-icons text-xs mr-1">event</span>
                          {formatDueDate(task.startTime)}
                        </div>
                      )}
                      {task.leadId && leads && (
                        <div className="flex items-center mr-3">
                          <span className="material-icons text-xs mr-1">person</span>
                          {leads.find(lead => lead.id === task.leadId)?.fullName || `Lead #${task.leadId}`}
                        </div>
                      )}
                      {task.aiGenerated && (
                        <div className="flex items-center">
                          <span className="material-icons text-xs mr-1">auto_awesome</span>
                          AI Generated
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <span className="material-icons">more_vert</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openTaskModal(task)}>
                        <span className="material-icons mr-2 text-sm">edit</span>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteTask(task.id)}>
                        <span className="material-icons mr-2 text-sm">delete</span>
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toggleTaskCompletion({ 
                          taskId: task.id, 
                          completed: !task.completed 
                        });
                      }}>
                        <span className="material-icons mr-2 text-sm">
                          {task.completed ? "replay" : "check_circle"}
                        </span>
                        {task.completed ? "Mark as incomplete" : "Mark as complete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Form Dialog */}
      <Dialog open={isCreatingTask} onOpenChange={(open) => !open && setIsCreatingTask(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask 
                ? "Update the details of your task." 
                : "Add a new task to your list."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add details about this task..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Lead</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lead (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {leads?.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            {lead.fullName} {lead.company ? `(${lead.company})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="completed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mark as completed</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              {editingTask && (
                <div className="flex justify-between items-center pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => deleteTask(editingTask.id)}
                    disabled={isDeleting || isPending}
                  >
                    {isDeleting ? (
                      <span className="material-icons animate-spin mr-2">refresh</span>
                    ) : (
                      <span className="material-icons mr-2">delete</span>
                    )}
                    Delete
                  </Button>
                </div>
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreatingTask(false)}
                  disabled={isPending || isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isPending || isDeleting}
                >
                  {isPending ? (
                    <>
                      <span className="material-icons animate-spin mr-2">refresh</span>
                      Saving...
                    </>
                  ) : (
                    editingTask ? "Update Task" : "Create Task"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
