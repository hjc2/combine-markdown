const { Plugin, TFolder, Notice, Modal, Setting } = require('obsidian');

class FolderSelectorModal extends Modal {
    constructor(app, onSubmit) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Select folder to combine' });

        const folders = this.getAllFolders();
        
        new Setting(contentEl)
            .setName('Folder')
            .setDesc('Choose the folder containing markdown files')
            .addDropdown(dropdown => {
                folders.forEach(folder => {
                    dropdown.addOption(folder.path, folder.path);
                });
                dropdown.onChange(value => {
                    this.selectedFolder = value;
                });
                if (folders.length > 0) {
                    this.selectedFolder = folders[0].path;
                }
            });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Combine')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(this.selectedFolder);
                }));
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

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
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
//