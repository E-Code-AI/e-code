import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isLoading: boolean;
  initialDescription?: string;
}

const formSchema = z.object({
  name: z.string().min(1, "Project name is required").max(50, "Project name must be less than 50 characters"),
  description: z.string().optional(),
  template: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const CreateProjectModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading,
  initialDescription = ""
}: CreateProjectModalProps) => {
  const [aiGenerated, setAiGenerated] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: initialDescription,
      template: "blank",
    },
  });
  
  // Update form values when initialDescription changes
  useEffect(() => {
    if (initialDescription) {
      // Extract a name from the description
      let projectName = "";
      if (initialDescription.includes("web app") || initialDescription.includes("website")) {
        projectName = "My Website";
      } else if (initialDescription.includes("game")) {
        projectName = "Fun Game";
      } else if (initialDescription.includes("app")) {
        projectName = "My App";
      } else {
        // Use the first 3-4 words as the name
        const words = initialDescription.split(" ").slice(0, 4);
        projectName = words.join(" ");
        // Capitalize first letter
        projectName = projectName.charAt(0).toUpperCase() + projectName.slice(1);
      }
      
      form.setValue("name", projectName);
      form.setValue("description", initialDescription);
    }
  }, [initialDescription, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit(values.name);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <DialogHeader>
            <DialogTitle>Let's Create Something New!</DialogTitle>
            <DialogDescription>
              What would you like to call your creation? You can also tell us what you want to make.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-right">
                Name your creation
              </Label>
              <Input
                id="name"
                placeholder="Something fun and creative"
                {...form.register("name")}
                className="col-span-3"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-right">
                What do you want to make? (optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Tell us about your idea..."
                {...form.register("description")}
                className="min-h-[80px] resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template" className="text-right">
                How do you want to start?
              </Label>
              <Select defaultValue="blank" {...form.register("template")}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Choose a starting point" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Start from scratch</SelectItem>
                  <SelectItem value="html">HTML/CSS/JS</SelectItem>
                  <SelectItem value="react">React</SelectItem>
                  <SelectItem value="express">Express.js</SelectItem>
                  <SelectItem value="flask">Flask</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setAiGenerated(!aiGenerated)}
            >
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Generate with AI
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};