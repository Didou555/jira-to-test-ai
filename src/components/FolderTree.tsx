import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FolderNode {
  id: number;
  name: string;
  path?: string;
  children?: FolderNode[];
}

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId: number | null;
  onSelectFolder: (folderId: number, folderName: string) => void;
  level?: number;
}

const FolderTreeItem = ({
  folder,
  selectedFolderId,
  onSelectFolder,
  level = 0,
}: {
  folder: FolderNode;
  selectedFolderId: number | null;
  onSelectFolder: (folderId: number, folderName: string) => void;
  level?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors",
          isSelected && "bg-muted"
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        {/* Toggle button pour les dossiers avec enfants */}
        {hasChildren ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
            type="button"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        {/* Icône dossier */}
        <div className="shrink-0">
          {isOpen ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Radio button */}
        <RadioGroupItem
          value={folder.id.toString()}
          id={`folder-${folder.id}`}
          className="shrink-0"
        />

        {/* Label avec nom du dossier */}
        <Label
          htmlFor={`folder-${folder.id}`}
          className="flex-1 cursor-pointer text-sm"
          onClick={() => onSelectFolder(folder.id, folder.name)}
        >
          <div className={cn("font-medium", isSelected && "text-primary")}>
            {folder.name}
          </div>
          {folder.path && (
            <div className="text-xs text-muted-foreground truncate">
              {folder.path}
            </div>
          )}
        </Label>
      </div>

      {/* Sous-dossiers */}
      {hasChildren && isOpen && (
        <div className="mt-1">
          {folder.children!.map((childFolder) => (
            <FolderTreeItem
              key={childFolder.id}
              folder={childFolder}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderTree = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  level = 0,
}: FolderTreeProps) => {
  return (
    <div className="space-y-1">
      {folders.map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          level={level}
        />
      ))}
    </div>
  );
};
