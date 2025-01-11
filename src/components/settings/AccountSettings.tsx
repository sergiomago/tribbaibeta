import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface AccountSettingsProps {
  name: string;
  currentPassword: string;
  newPassword: string;
  loading: boolean;
  setName: (name: string) => void;
  setCurrentPassword: (password: string) => void;
  setNewPassword: (password: string) => void;
  handleUpdateProfile: () => void;
  handleChangePassword: () => void;
}

export const AccountSettings = ({
  name,
  currentPassword,
  newPassword,
  loading,
  setName,
  setCurrentPassword,
  setNewPassword,
  handleUpdateProfile,
  handleChangePassword,
}: AccountSettingsProps) => {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
          />
        </div>
        
        <Button
          onClick={handleUpdateProfile}
          disabled={loading}
        >
          Update Profile
        </Button>

        <div className="space-y-2 pt-4">
          <Label>Change Password</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="mb-2"
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
          />
          <Button
            onClick={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword}
            className="mt-2"
          >
            Change Password
          </Button>
        </div>

        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};