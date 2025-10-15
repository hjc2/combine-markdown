const { Plugin, TFolder, Notice } = require('obsidian');
const { FuzzySuggestModal } = require('obsidian');

class FolderSelectorModal extends FuzzySuggestModal {
    constructor(app, onSubmit) {
        super(app);
        this.onSubmit = onSubmit;
    }

    getItems() {
        return this.getAllFolders();
    }

    getItemText(folder) {
        return folder.path;
    }

    onChooseItem(folder, evt) {
        this.onSubmit(folder.path);
    }
    
    onOpen() {
        super.onOpen();
        this.setPlaceholder('Type to search for a folder...');
    }

    getAllFolders() {
        const folders = [];
        const rootFolder = this.app.vault.getRoot();
        
        const traverse = (folder) => {
            folders.push(folder);
            folder.children.forEach(child => {
                if (child instanceof TFolder) {
                    traverse(child);
                }
            });
        };
        
        traverse(rootFolder);
        return folders;
    }
}

class CombineMarkdownPlugin extends Plugin {
    async onload() {
        // Add ribbon icon
        this.addRibbonIcon('files', 'Combine Markdown Files', () => {
            this.showFolderSelector();
        });

        // Add command
        this.addCommand({
            id: 'combine-markdown-files',
            name: 'Combine markdown files from folder',
            callback: () => {
                this.showFolderSelector();
            }
        });
    }

    showFolderSelector() {
        new FolderSelectorModal(this.app, (folderPath) => {
            this.combineMarkdownFiles(folderPath);
        }).open();
    }

    async combineMarkdownFiles(folderPath) {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        
        if (!(folder instanceof TFolder)) {
            new Notice('Invalid folder selected');
            return;
        }

        const markdownFiles = this.getAllMarkdownFiles(folder);
        
        if (markdownFiles.length === 0) {
            new Notice('No markdown files found in this folder');
            return;
        }

        let combinedContent = `# Combined Markdown Files\n`;
        combinedContent += `*Generated from: ${folderPath}*\n`;
        combinedContent += `*Total files: ${markdownFiles.length}*\n\n`;
        combinedContent += `---\n\n`;

        for (const file of markdownFiles) {
            const content = await this.app.vault.read(file);
            
            combinedContent += `## File: ${file.path}\n\n`;
            combinedContent += content;
            combinedContent += `\n\n---\n\n`;
        }

        // Create the combined file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const outputFileName = `combined-${folder.name}-${timestamp}.md`;
        
        await this.app.vault.create(outputFileName, combinedContent);
        
        new Notice(`Created ${outputFileName} with ${markdownFiles.length} files`);
        
        // Open the new file
        const newFile = this.app.vault.getAbstractFileByPath(outputFileName);
        if (newFile) {
            await this.app.workspace.getLeaf().openFile(newFile);
        }
    }

    getAllMarkdownFiles(folder) {
        const files = [];
        
        const traverse = (currentFolder) => {
            currentFolder.children.forEach(child => {
                if (child instanceof TFolder) {
                    traverse(child);
                } else if (child.extension === 'md') {
                    files.push(child);
                }
            });
        };
        
        traverse(folder);
        
        // Sort by path for consistent ordering
        files.sort((a, b) => a.path.localeCompare(b.path));
        
        return files;
    }
}

module.exports = CombineMarkdownPlugin;