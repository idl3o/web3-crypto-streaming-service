<template>
  <div class="app-editor" :class="{ 'dark-theme': isDarkMode }">
    <div class="editor-header">
      <h1>Web3 Streaming App Editor</h1>
      
      <div class="editor-controls">
        <button @click="saveCurrentFile" class="save-btn" :disabled="!hasChanges">
          <i class="fas fa-save"></i> Save
        </button>
        <button @click="newFile" class="new-btn">
          <i class="fas fa-plus"></i> New
        </button>
        <select v-model="selectedLanguage" class="language-selector">
          <option value="javascript">JavaScript</option>
          <option value="vue">Vue</option>
          <option value="css">CSS</option>
          <option value="html">HTML</option>
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
        </select>
        <div class="theme-toggle">
          <label>Dark Mode</label>
          <toggle-switch v-model="isDarkMode" />
        </div>
      </div>
    </div>
    
    <div class="editor-layout">
      <div class="file-explorer">
        <h2>Files</h2>
        <div class="search-box">
          <input type="text" placeholder="Search files..." v-model="searchQuery" @input="filterFiles" />
        </div>
        <div class="file-tree">
          <div 
            v-for="file in filteredFiles" 
            :key="file.path"
            @click="openFile(file)"
            :class="{ 'active': currentFile && currentFile.path === file.path }"
            class="file-item"
          >
            <i :class="getFileIconClass(file)"></i>
            <span>{{ getFileName(file) }}</span>
          </div>
        </div>
      </div>
      
      <div class="code-editor-container">
        <div class="editor-tabs" v-if="openFiles.length > 0">
          <div 
            v-for="file in openFiles" 
            :key="file.path"
            @click="selectFile(file)"
            :class="{ 'active': currentFile && currentFile.path === file.path }"
            class="editor-tab"
          >
            <span>{{ getFileName(file) }}</span>
            <i class="fas fa-times" @click.stop="closeFile(file)"></i>
          </div>
        </div>
        
        <div class="code-editor" ref="codeEditor"></div>
      </div>
      
      <div class="editor-preview" v-if="showPreview">
        <h2>Preview <button @click="togglePreview" class="toggle-preview"><i class="fas fa-eye-slash"></i></button></h2>
        <div class="preview-container" ref="previewContainer"></div>
      </div>
    </div>
    
    <div class="editor-statusbar">
      <div class="status-left">
        <span v-if="currentFile">
          {{ currentFile.path }} | {{ selectedLanguage }} | {{ currentFile.encoding || 'UTF-8' }}
        </span>
        <span v-else>No file selected</span>
      </div>
      <div class="status-right">
        <span v-if="hasChanges" class="unsaved-indicator">
          <i class="fas fa-circle"></i> Unsaved changes
        </span>
        <span class="cursor-position">Ln {{ cursorPosition.line }}, Col {{ cursorPosition.column }}</span>
      </div>
    </div>
    
    <new-file-dialog 
      v-if="showNewFileDialog"
      @close="showNewFileDialog = false"
      @create="createNewFile"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import ToggleSwitch from '../common/ToggleSwitch.vue';
import NewFileDialog from './NewFileDialog.vue';
import { useMinimalMode } from '@/composables/useMinimalMode';
import EditorService from '@/services/EditorService';
import * as monaco from 'monaco-editor';

export default {
  name: 'AppEditor',
  components: {
    ToggleSwitch,
    NewFileDialog
  },
  
  setup() {
    const { isMinimalMode } = useMinimalMode();
    
    // Editor state
    const codeEditor = ref(null);
    const editorInstance = ref(null);
    const previewContainer = ref(null);
    const currentFile = ref(null);
    const openFiles = ref([]);
    const files = ref([]);
    const filteredFiles = ref([]);
    const searchQuery = ref('');
    const isDarkMode = ref(false);
    const selectedLanguage = ref('javascript');
    const showPreview = ref(true);
    const showNewFileDialog = ref(false);
    const hasChanges = ref(false);
    const cursorPosition = reactive({ line: 1, column: 1 });
    
    // Initialize editor
    onMounted(async () => {
      // Load file list
      try {
        const fileList = await EditorService.getFileList();
        files.value = fileList;
        filteredFiles.value = [...fileList];
      } catch (error) {
        console.error('Failed to load file list:', error);
      }
      
      // Initialize Monaco editor
      if (codeEditor.value) {
        editorInstance.value = monaco.editor.create(codeEditor.value, {
          language: selectedLanguage.value,
          theme: isDarkMode.value ? 'vs-dark' : 'vs',
          automaticLayout: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          tabSize: 2,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          formatOnPaste: true,
          formatOnType: true
        });
        
        // Set up editor event listeners
        editorInstance.value.onDidChangeModelContent(() => {
          if (currentFile.value) {
            hasChanges.value = true;
          }
        });
        
        editorInstance.value.onDidChangeCursorPosition((e) => {
          cursorPosition.line = e.position.lineNumber;
          cursorPosition.column = e.position.column;
        });
        
        // Check for unsaved changes before leaving
        window.addEventListener('beforeunload', (e) => {
          if (hasChanges.value) {
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
          }
        });
      }
    });
    
    // Cleanup on unmount
    onBeforeUnmount(() => {
      if (editorInstance.value) {
        editorInstance.value.dispose();
      }
      
      window.removeEventListener('beforeunload', () => {});
    });
    
    // Watch for theme changes
    watch(isDarkMode, (newVal) => {
      if (editorInstance.value) {
        monaco.editor.setTheme(newVal ? 'vs-dark' : 'vs');
      }
    });
    
    // Watch for language changes
    watch(selectedLanguage, (newVal) => {
      if (editorInstance.value && currentFile.value) {
        monaco.editor.setModelLanguage(editorInstance.value.getModel(), newVal);
      }
    });
    
    const filterFiles = () => {
      if (!searchQuery.value) {
        filteredFiles.value = [...files.value];
        return;
      }
      
      const query = searchQuery.value.toLowerCase();
      filteredFiles.value = files.value.filter(file => 
        file.path.toLowerCase().includes(query) || 
        file.name.toLowerCase().includes(query)
      );
    };
    
    const getFileIconClass = (file) => {
      const ext = file.path.split('.').pop().toLowerCase();
      switch (ext) {
        case 'js': return 'fas fa-file-code file-icon-js';
        case 'vue': return 'fab fa-vuejs file-icon-vue';
        case 'css': return 'fas fa-file-code file-icon-css';
        case 'html': return 'fas fa-file-code file-icon-html';
        case 'json': return 'fas fa-file-code file-icon-json';
        case 'md': return 'fas fa-file-alt file-icon-md';
        default: return 'fas fa-file';
      }
    };
    
    const getFileName = (file) => {
      return file.name || file.path.split('/').pop();
    };
    
    const openFile = async (file) => {
      try {
        // Check for unsaved changes
        if (hasChanges.value && currentFile.value) {
          if (confirm('You have unsaved changes. Continue without saving?')) {
            hasChanges.value = false;
          } else {
            return;
          }
        }
        
        // Load file content
        const fileContent = await EditorService.getFileContent(file.path);
        
        // Add to open files if not already open
        if (!openFiles.value.some(f => f.path === file.path)) {
          openFiles.value.push(file);
        }
        
        currentFile.value = file;
        
        // Determine language based on file extension
        const ext = file.path.split('.').pop().toLowerCase();
        switch (ext) {
          case 'js': selectedLanguage.value = 'javascript'; break;
          case 'vue': selectedLanguage.value = 'html'; break;
          case 'css': selectedLanguage.value = 'css'; break;
          case 'html': selectedLanguage.value = 'html'; break;
          case 'json': selectedLanguage.value = 'json'; break;
          case 'md': selectedLanguage.value = 'markdown'; break;
          default: selectedLanguage.value = 'plaintext';
        }
        
        // Set content in editor
        if (editorInstance.value) {
          const model = monaco.editor.createModel(
            fileContent,
            selectedLanguage.value
          );
          editorInstance.value.setModel(model);
          hasChanges.value = false;
        }
        
        // Update preview if needed
        if (ext === 'vue' || ext === 'html') {
          updatePreview(fileContent);
        }
      } catch (error) {
        console.error(`Failed to open file ${file.path}:`, error);
      }
    };
    
    const selectFile = (file) => {
      if (currentFile.value && currentFile.value.path === file.path) {
        return;
      }
      
      openFile(file);
    };
    
    const closeFile = (file) => {
      // Check for unsaved changes
      if (hasChanges.value && currentFile.value && currentFile.value.path === file.path) {
        if (!confirm('You have unsaved changes. Close without saving?')) {
          return;
        }
      }
      
      // Remove from open files
      const index = openFiles.value.findIndex(f => f.path === file.path);
      if (index !== -1) {
        openFiles.value.splice(index, 1);
      }
      
      // If this was the current file, select another open file or clear
      if (currentFile.value && currentFile.value.path === file.path) {
        if (openFiles.value.length > 0) {
          selectFile(openFiles.value[0]);
        } else {
          currentFile.value = null;
          if (editorInstance.value) {
            editorInstance.value.setModel(null);
          }
          hasChanges.value = false;
        }
      }
    };
    
    const saveCurrentFile = async () => {
      if (!currentFile.value || !editorInstance.value) {
        return;
      }
      
      try {
        const content = editorInstance.value.getValue();
        await EditorService.saveFileContent(currentFile.value.path, content);
        hasChanges.value = false;
      } catch (error) {
        console.error(`Failed to save file ${currentFile.value.path}:`, error);
      }
    };
    
    const newFile = () => {
      showNewFileDialog.value = true;
    };
    
    const createNewFile = async (fileInfo) => {
      try {
        // Create new file
        await EditorService.createFile(fileInfo.path, fileInfo.content || '');
        
        // Refresh file list
        const fileList = await EditorService.getFileList();
        files.value = fileList;
        filteredFiles.value = [...fileList];
        
        // Open the new file
        const newFile = { path: fileInfo.path, name: fileInfo.path.split('/').pop() };
        openFile(newFile);
        showNewFileDialog.value = false;
      } catch (error) {
        console.error(`Failed to create file ${fileInfo.path}:`, error);
      }
    };
    
    const togglePreview = () => {
      showPreview.value = !showPreview.value;
    };
    
    const updatePreview = (content) => {
      if (!previewContainer.value || !showPreview.value) {
        return;
      }
      
      // Simple preview for HTML/Vue content
      previewContainer.value.innerHTML = content;
    };
    
    return {
      codeEditor,
      previewContainer,
      currentFile,
      openFiles,
      files,
      filteredFiles,
      searchQuery,
      isDarkMode,
      selectedLanguage,
      showPreview,
      showNewFileDialog,
      hasChanges,
      cursorPosition,
      filterFiles,
      getFileIconClass,
      getFileName,
      openFile,
      selectFile,
      closeFile,
      saveCurrentFile,
      newFile,
      createNewFile,
      togglePreview
    };
  }
};
</script>

<style scoped>
.app-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  color: var(--text-primary);
  background-color: var(--bg-medium);
}

.editor-header {
  padding: 1rem;
  background-color: var(--bg-dark);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.editor-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.file-explorer {
  width: 250px;
  background-color: var(--bg-dark);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-explorer h2 {
  padding: 0.5rem 1rem;
  margin: 0;
  font-size: 1rem;
  border-bottom: 1px solid var(--border);
}

.search-box {
  padding: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.search-box input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--bg-medium);
  color: var(--text-primary);
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.file-item {
  padding: 0.25rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-item:hover {
  background-color: var(--bg-medium-hover);
}

.file-item.active {
  background-color: var(--bg-medium);
  font-weight: bold;
}

.code-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-tabs {
  display: flex;
  background-color: var(--bg-dark);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.editor-tab {
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-right: 1px solid var(--border);
  min-width: 100px;
}

.editor-tab.active {
  background-color: var(--bg-medium);
  border-bottom: 2px solid var(--primary);
}

.editor-tab i {
  opacity: 0.5;
}

.editor-tab:hover i {
  opacity: 1;
}

.code-editor {
  flex: 1;
}

.editor-preview {
  width: 350px;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-preview h2 {
  padding: 0.5rem 1rem;
  margin: 0;
  font-size: 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-preview {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}

.preview-container {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  background-color: var(--bg-light);
}

.editor-statusbar {
  padding: 0.5rem 1rem;
  background-color: var(--bg-dark);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.unsaved-indicator {
  color: var(--warning);
  margin-right: 1rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--bg-medium);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

button:hover {
  background-color: var(--bg-medium-hover);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn {
  background-color: var(--primary);
  color: var(--text-on-primary);
}

.save-btn:disabled {
  background-color: var(--bg-medium);
  color: var(--text-secondary);
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.language-selector {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--bg-medium);
  color: var(--text-primary);
}

.file-icon-js {
  color: #f7df1e;
}

.file-icon-vue {
  color: #42b883;
}

.file-icon-css {
  color: #264de4;
}

.file-icon-html {
  color: #e34f26;
}

.file-icon-json {
  color: #5b5b5b;
}

.file-icon-md {
  color: #ffffff;
}

/* Uranium theme specifics */
:global(.uranium-theme) .app-editor {
  --bg-dark: var(--uranium-bg-dark);
  --bg-medium: var(--uranium-bg-medium);
  --bg-light: var(--uranium-bg-light);
  --bg-medium-hover: var(--uranium-secondary-light);
  --border: var(--uranium-border);
  --text-primary: var(--uranium-text-primary);
  --text-secondary: var(--uranium-text-secondary);
  --primary: var(--uranium-primary);
  --text-on-primary: var(--uranium-secondary-dark);
  --warning: var(--uranium-warning);
}

:global(.uranium-theme) .editor-header,
:global(.uranium-theme) .file-explorer,
:global(.uranium-theme) .editor-tabs,
:global(.uranium-theme) .editor-statusbar {
  box-shadow: var(--uranium-shadow-sm);
}

:global(.uranium-theme) .save-btn {
  box-shadow: var(--uranium-shadow-sm);
}

:global(.uranium-theme) .save-btn:hover {
  box-shadow: var(--uranium-shadow-md), var(--uranium-primary-glow);
}
</style>
