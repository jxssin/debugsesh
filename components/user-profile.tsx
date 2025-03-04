import { useState, useRef } from "react";
import { User, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useUser } from "@/contexts/user-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function UserProfile() {
  const { user } = useAuth();
  const { isPremium } = useUser();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Extract username from metadata or email
  const username = user?.user_metadata?.username || 
                   user?.email?.split('@')[0] || 
                   "Guest";
  
  const handleProfileClick = () => {
    setShowUploadDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!profilePicture || !user) return;
    
    setIsUploading(true);
    
    try {
      // Convert data URL to blob
      const response = await fetch(profilePicture);
      const blob = await response.blob();
      
      // Create a file with a unique name
      const file = new File([blob], `profile_${user.id}_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(`${user.id}/profile.jpg`, file, {
          upsert: true
        });
      
      if (error) {
        console.error('Error uploading profile picture:', error);
        // Show error notification here
      } else {
        // Update user metadata with profile picture URL
        const { data: publicUrlData } = supabase.storage
          .from('profiles')
          .getPublicUrl(`${user.id}/profile.jpg`);
          
        // Update user metadata in Supabase Auth
        await supabase.auth.updateUser({
          data: {
            avatar_url: publicUrlData.publicUrl
          }
        });
      }
    } catch (error) {
      console.error('Error in upload process:', error);
    } finally {
      setIsUploading(false);
      setShowUploadDialog(false);
    }
  };

  return (
    <div className="p-4 border-b space-y-4">
      {/* User Profile */}
      <div className="flex items-start gap-3">
        <div 
          className="flex items-center justify-center w-10 h-10 rounded-full border mt-0 cursor-pointer overflow-hidden" 
          onClick={handleProfileClick}
          title="Update profile picture"
        >
          {profilePicture || user?.user_metadata?.avatar_url ? (
            <img 
              src={profilePicture || user?.user_metadata?.avatar_url} 
              alt="Profile" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <User size={24} className="text-foreground" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="relative">
            <Badge variant="outline" className="absolute -top-3 -left-1 text-[10px] px-1 py-0 font-medium">
              {isPremium ? "PREMIUM" : "FREE"}
            </Badge>
            <span className="text-sm mt-1 block">{username}</span>
          </div>
        </div>
      </div>

      {/* Profile Picture Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
            <DialogDescription>
              Upload a new profile picture. Recommended size: 200x200px.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-24 h-24 rounded-full border-2 flex items-center justify-center overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt="Preview" className="w-full h-full object-cover" />
              ) : user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Current profile" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-muted-foreground" />
              )}
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex gap-2"
              >
                <Upload size={16} />
                Choose Image
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleUpload}
              disabled={!profilePicture || isUploading}
            >
              {isUploading ? "Uploading..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}