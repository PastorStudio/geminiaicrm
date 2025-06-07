import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertLeadSchema, Lead } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useGemini } from "@/hooks/useGemini";

// Extend the lead schema for the form
const leadFormSchema = insertLeadSchema.extend({
  analyzeWithAI: z.boolean().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<Lead>;
}

export default function LeadForm({ open, onClose, initialData }: LeadFormProps) {
  const { toast } = useToast();
  const { analyzeLeadWithGemini, isAnalyzing } = useGemini();
  
  // Set up form with validation
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      fullName: initialData?.fullName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      company: initialData?.company || "",
      position: initialData?.position || "",
      source: initialData?.source || "",
      status: initialData?.status || "new",
      notes: initialData?.notes || "",
      analyzeWithAI: true,
    },
  });

  // Mutation for creating/updating a lead
  const { mutate: saveLead, isPending } = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const { analyzeWithAI, ...leadData } = values;
      
      if (initialData?.id) {
        // Update existing lead
        return apiRequest(
          "PATCH", 
          `/api/leads/${initialData.id}`, 
          leadData
        );
      } else {
        // Create new lead
        return apiRequest("POST", "/api/leads", leadData);
      }
    },
    onSuccess: async (response) => {
      const savedLead = await response.json();
      
      // If AI analysis requested, analyze the lead
      if (form.getValues().analyzeWithAI) {
        try {
          await analyzeLeadWithGemini(savedLead.id);
        } catch (error) {
          console.error("AI analysis failed:", error);
        }
      }
      
      // Invalidate lead queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      toast({
        title: initialData?.id ? "Lead updated" : "Lead created",
        description: `${savedLead.fullName} has been ${initialData?.id ? "updated" : "added"} successfully.`,
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${initialData?.id ? "update" : "create"} lead: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = (values: LeadFormValues) => {
    saveLead(values);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          <DialogDescription>
            {initialData?.id 
              ? "Update the lead's information below." 
              : "Fill in the details for the new lead."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email*</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (123) 456-7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="meeting">Meeting Scheduled</SelectItem>
                        <SelectItem value="closed-won">Closed (Won)</SelectItem>
                        <SelectItem value="closed-lost">Closed (Lost)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input placeholder="Marketing Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Source</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes about this lead..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {!initialData?.id && (
              <FormField
                control={form.control}
                name="analyzeWithAI"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="text-primary-600 focus:ring-primary-600 h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Analyze with Gemini AI</FormLabel>
                      <p className="text-sm text-gray-500">
                        Use AI to analyze this lead, determine match percentage, and enrich the profile.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isPending || isAnalyzing}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isPending || isAnalyzing}
              >
                {isPending || isAnalyzing ? (
                  <>
                    <span className="material-icons animate-spin mr-2">refresh</span>
                    {isAnalyzing ? "Analyzing..." : "Saving..."}
                  </>
                ) : (
                  initialData?.id ? "Update Lead" : "Create Lead"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
