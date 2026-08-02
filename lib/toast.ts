import { toast } from "@/hooks/use-toast";

export const showToast = {
  success: (title: string, description: string) => {
    toast({
      title: `✅ ${title}`,
      description,
    });
  },

  error: (title: string, description: string) => {
    toast({
      title: `❌ ${title}`,
      description,
      variant: "destructive",
    });
  },

  warning: (title: string, description: string) => {
    toast({
      title: `⚠️ ${title}`,
      description,
      variant: "destructive",
    });
  },

  info: (title: string, description: string) => {
    toast({
      title: `ℹ️ ${title}`,
      description,
    });
  },

  // Specific action toasts
  auth: {
    signInSuccess: (name?: string) => {
      const who = name?.trim() || "friend";
      toast({
        title: `🎉 Welcome back, ${who}!`,
        description: "Enjoy discovering books & happy learning!",
      });
    },
    signUpSuccess: (name?: string) => {
      const who = name?.trim() || "friend";
      toast({
        title: `🎉 Welcome, ${who}!`,
        description: "Your account is ready — enjoy discovering books & happy learning!",
      });
    },
    logoutSuccess: (name?: string) => {
      const who = name?.trim() || "friend";
      toast({
        title: `👋 Goodbye, ${who}!`,
        description: "Hope to see you soon again!",
      });
    },
  },

  book: {
    borrowSuccess: (bookTitle: string) => {
      toast({
        title: "📚 Book Borrowed!",
        description: `"${bookTitle}" has been added to your borrowed collection. Enjoy reading!`,
      });
    },
    createSuccess: (bookTitle: string) => {
      toast({
        title: "📖 Book Created!",
        description: `"${bookTitle}" has been added to the library collection.`,
      });
    },
    borrowError: (message: string) => {
      toast({
        title: "❌ Cannot Borrow Book",
        description: message,
        variant: "destructive",
      });
    },
    returnSuccess: (bookTitle: string) => {
      toast({
        title: "📚 Book Returned!",
        description: `"${bookTitle}" has been successfully returned to the library. Thank you!`,
      });
    },
    returnError: (message: string) => {
      toast({
        title: "❌ Cannot Return Book",
        description: message,
        variant: "destructive",
      });
    },
  },

  file: {
    uploadSuccess: (type: "image" | "video", fileName: string) => {
      toast({
        title: `✅ ${type === "image" ? "Image" : "Video"} Uploaded!`,
        description: `${fileName} has been uploaded successfully and is ready to use.`,
      });
    },
    uploadError: (message: string) => {
      toast({
        title: "📁 Upload Failed",
        description: message,
        variant: "destructive",
      });
    },
    fileTooLarge: (type: "image" | "video", maxSize: string) => {
      toast({
        title: "📁 File Too Large",
        description: `${type === "image" ? "Image" : "Video"} files must be smaller than ${maxSize}. Please compress your file and try again.`,
        variant: "destructive",
      });
    },
  },
};
