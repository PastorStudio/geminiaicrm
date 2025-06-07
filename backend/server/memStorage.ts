import { 
  type User, 
  type InsertUser,
  type Lead,
  type InsertLead,
  type Activity,
  type InsertActivity,
  type Message,
  type InsertMessage,
  type Survey,
  type InsertSurvey,
  type DashboardStats,
  type InsertDashboardStats
} from "@shared/schema";
import { IStorage } from './storage';

/**
 * Implementación de almacenamiento en memoria para desarrollo y pruebas
 */
export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private leadsData: Map<number, Lead>;
  private activitiesData: Map<number, Activity>;
  private messagesData: Map<number, Message>;
  private surveysData: Map<number, Survey>;
  private dashboardStatsData: Map<number, DashboardStats>;

  private userIdCounter: number;
  private leadIdCounter: number;
  private activityIdCounter: number;
  private messageIdCounter: number;
  private surveyIdCounter: number;
  private statsIdCounter: number;

  constructor() {
    this.usersData = new Map();
    this.leadsData = new Map();
    this.activitiesData = new Map();
    this.messagesData = new Map();
    this.surveysData = new Map();
    this.dashboardStatsData = new Map();

    this.userIdCounter = 1;
    this.leadIdCounter = 1;
    this.activityIdCounter = 1;
    this.messageIdCounter = 1;
    this.surveyIdCounter = 1;
    this.statsIdCounter = 1;
  }

  async initializeData() {
    // Create an admin user if none exists
    const adminUser = await this.getUserByUsername("sarahjohnson");
    if (!adminUser) {
      await this.createUser({
        username: "sarahjohnson",
        password: "password123", // In a real app, this would be hashed
        fullName: "Sarah Johnson",
        email: "sarah.johnson@example.com",
        role: "admin",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
      });
    }

    // Create some mock dashboard stats if none exist
    const stats = await this.getDashboardStats();
    if (!stats) {
      await this.updateDashboardStats({
        totalLeads: 1652,
        conversionRate: 2450, // 24.5%
        activeConversations: 37,
        todayMeetings: 5,
        leadsByStatus: {
          new: 425,
          contacted: 312,
          qualified: 211,
          proposal: 156,
          negotiation: 98,
          "closed-won": 315,
          "closed-lost": 135
        }
      });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.usersData.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    
    const newUser: User = { ...user, id, createdAt };
    this.usersData.set(id, newUser);
    
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.usersData.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser: User = { ...existingUser, ...userData };
    this.usersData.set(id, updatedUser);
    
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersData.values());
  }

  async getLead(id: number): Promise<Lead | undefined> {
    return this.leadsData.get(id);
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    const result: Lead[] = [];
    for (const lead of this.leadsData.values()) {
      if (lead.status === status) {
        result.push(lead);
      }
    }
    return result;
  }

  async getLeadsByAssignee(userId: number): Promise<Lead[]> {
    const result: Lead[] = [];
    for (const lead of this.leadsData.values()) {
      if (lead.assignedTo === userId) {
        result.push(lead);
      }
    }
    return result;
  }

  async getLeadsByPhone(phone: string): Promise<Lead[]> {
    const result: Lead[] = [];
    for (const lead of this.leadsData.values()) {
      if (lead.phone === phone || lead.whatsappPhone === phone) {
        result.push(lead);
      }
    }
    return result;
  }

  async getAllLeads(): Promise<Lead[]> {
    return Array.from(this.leadsData.values());
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const id = this.leadIdCounter++;
    const createdAt = new Date();
    
    const newLead: Lead = { ...lead, id, createdAt };
    this.leadsData.set(id, newLead);
    
    return newLead;
  }

  async updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const existingLead = this.leadsData.get(id);
    if (!existingLead) {
      return undefined;
    }
    
    const updatedLead: Lead = { ...existingLead, ...lead };
    this.leadsData.set(id, updatedLead);
    
    return updatedLead;
  }

  async updateLeadStatus(id: number, status: string): Promise<Lead | undefined> {
    const existingLead = this.leadsData.get(id);
    if (!existingLead) {
      return undefined;
    }
    
    const updatedLead: Lead = { ...existingLead, status };
    this.leadsData.set(id, updatedLead);
    
    return updatedLead;
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activitiesData.get(id);
  }

  async getActivitiesByLead(leadId: number): Promise<Activity[]> {
    const result: Activity[] = [];
    for (const activity of this.activitiesData.values()) {
      if (activity.leadId === leadId) {
        result.push(activity);
      }
    }
    return result;
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    const result: Activity[] = [];
    for (const activity of this.activitiesData.values()) {
      if (activity.userId === userId) {
        result.push(activity);
      }
    }
    return result;
  }

  async getUpcomingActivities(userId: number, limit: number = 10): Promise<Activity[]> {
    const now = new Date();
    const userActivities = Array.from(this.activitiesData.values())
      .filter(activity => activity.userId === userId && activity.startTime && activity.startTime > now)
      .sort((a, b) => {
        // Handle possible null values (should not happen based on filter, but TypeScript wants this)
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.getTime() - b.startTime.getTime();
      });
    
    return userActivities.slice(0, limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const createdAt = new Date();
    
    const newActivity: Activity = { ...activity, id, createdAt };
    this.activitiesData.set(id, newActivity);
    
    return newActivity;
  }

  async updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined> {
    const existingActivity = this.activitiesData.get(id);
    if (!existingActivity) {
      return undefined;
    }
    
    const updatedActivity: Activity = { ...existingActivity, ...activity };
    this.activitiesData.set(id, updatedActivity);
    
    return updatedActivity;
  }

  async completeActivity(id: number): Promise<Activity | undefined> {
    const existingActivity = this.activitiesData.get(id);
    if (!existingActivity) {
      return undefined;
    }
    
    const updatedActivity: Activity = { ...existingActivity, completed: true };
    this.activitiesData.set(id, updatedActivity);
    
    return updatedActivity;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    return this.messagesData.get(id);
  }

  async getMessagesByLead(leadId: number): Promise<Message[]> {
    const result: Message[] = [];
    for (const message of this.messagesData.values()) {
      if (message.leadId === leadId) {
        result.push(message);
      }
    }
    return result;
  }

  async getRecentMessages(limit: number = 10): Promise<Message[]> {
    return Array.from(this.messagesData.values())
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, limit);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const sentAt = new Date();
    
    const newMessage: Message = { ...message, id, sentAt };
    this.messagesData.set(id, newMessage);
    
    return newMessage;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const existingMessage = this.messagesData.get(id);
    if (!existingMessage) {
      return undefined;
    }
    
    const updatedMessage: Message = { ...existingMessage, read: true };
    this.messagesData.set(id, updatedMessage);
    
    return updatedMessage;
  }

  async getSurvey(id: number): Promise<Survey | undefined> {
    return this.surveysData.get(id);
  }

  async getSurveysByLead(leadId: number): Promise<Survey[]> {
    const result: Survey[] = [];
    for (const survey of this.surveysData.values()) {
      if (survey.leadId === leadId) {
        result.push(survey);
      }
    }
    return result;
  }

  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const id = this.surveyIdCounter++;
    const sentAt = new Date();
    
    const newSurvey: Survey = { ...survey, id, sentAt };
    this.surveysData.set(id, newSurvey);
    
    return newSurvey;
  }

  async updateSurveyResponses(id: number, responses: any): Promise<Survey | undefined> {
    const existingSurvey = this.surveysData.get(id);
    if (!existingSurvey) {
      return undefined;
    }
    
    const completedAt = new Date();
    const updatedSurvey: Survey = { ...existingSurvey, responses, completedAt };
    this.surveysData.set(id, updatedSurvey);
    
    return updatedSurvey;
  }

  async getDashboardStats(): Promise<DashboardStats | undefined> {
    // Usually this would get the most recent stats
    if (this.dashboardStatsData.size === 0) {
      return undefined;
    }
    
    // Just return the first item since we'll only have one in this simple implementation
    return this.dashboardStatsData.get(1);
  }

  async updateDashboardStats(stats: InsertDashboardStats): Promise<DashboardStats> {
    const id = 1; // Always use ID 1 for dashboard stats in this simple implementation
    const updatedAt = new Date();
    
    const newStats: DashboardStats = { ...stats, id, updatedAt };
    this.dashboardStatsData.set(id, newStats);
    
    return newStats;
  }
}