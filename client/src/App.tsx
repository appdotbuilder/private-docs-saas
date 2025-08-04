
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { 
  Document, 
  DocumentListResponse, 
  UploadDocumentInput, 
  SearchDocumentsInput,
  GetUserDocumentsInput,
  LoginInput,
  RegisterInput
} from '../../server/src/schema';
import { 
  Upload, 
  Search, 
  FileText, 
  Image, 
  File, 
  Calendar, 
  Trash2, 
  Edit3, 
  Eye,
  Archive,
  LogOut,
  Plus
} from 'lucide-react';

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<'JPEG' | 'PDF' | 'JSON' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Dialog states
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form states
  const [authFormData, setAuthFormData] = useState<LoginInput & { name?: string }>({
    email: '',
    password: '',
    name: ''
  });
  const [uploadFormData, setUploadFormData] = useState<Partial<UploadDocumentInput>>({
    filename: '',
    original_filename: '',
    file_type: 'PDF',
    file_size: 0,
    file_path: '',
    content_text: null,
    metadata: null,
    upload_source: 'WEB_INTERFACE',
    external_service_id: null
  });
  const [editFormData, setEditFormData] = useState({
    filename: '',
    content_text: ''
  });

  // Load user documents
  const loadDocuments = useCallback(async (page = 0, append = false) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const input: GetUserDocumentsInput = {
        limit: 20,
        offset: page * 20,
        file_type: selectedFileType === 'all' ? undefined : selectedFileType
      };
      const result: DocumentListResponse = await trpc.getUserDocuments.query(input);
      
      if (append) {
        setDocuments(prev => [...prev, ...result.documents]);
      } else {
        setDocuments(result.documents);
      }
      setTotalDocuments(result.total);
      setHasMore(result.has_more);
    } catch (error) {
      console.error('Errore nel caricamento dei documenti:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, selectedFileType]);

  // Search documents
  const searchDocuments = useCallback(async (query: string) => {
    if (!isAuthenticated || !query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const input: SearchDocumentsInput = {
        query: query.trim(),
        file_type: selectedFileType === 'all' ? undefined : selectedFileType,
        limit: 50,
        offset: 0
      };
      const result: DocumentListResponse = await trpc.searchDocuments.query(input);
      setSearchResults(result.documents);
    } catch (error) {
      console.error('Errore nella ricerca:', error);
    } finally {
      setIsSearching(false);
    }
  }, [isAuthenticated, selectedFileType]);

  // Authentication handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (authMode === 'login') {
        const result = await trpc.login.mutate({
          email: authFormData.email,
          password: authFormData.password
        });
        setUser(result.user);
        setIsAuthenticated(true);
      } else {
        const registerData: RegisterInput = {
          email: authFormData.email,
          password: authFormData.password,
          name: authFormData.name || ''
        };
        const result = await trpc.register.mutate(registerData);
        setUser(result.user);
        setIsAuthenticated(true);
      }
      setAuthFormData({ email: '', password: '', name: '' });
    } catch (error) {
      console.error('Errore di autenticazione:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setDocuments([]);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Document handlers
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFormData.filename || !uploadFormData.original_filename) return;

    setIsLoading(true);
    try {
      const uploadData: UploadDocumentInput = {
        filename: uploadFormData.filename,
        original_filename: uploadFormData.original_filename,
        file_type: uploadFormData.file_type || 'PDF',
        file_size: uploadFormData.file_size || 0,
        file_path: uploadFormData.file_path || '',
        content_text: uploadFormData.content_text || null,
        metadata: uploadFormData.metadata || null,
        upload_source: 'WEB_INTERFACE',
        external_service_id: null
      };
      
      const newDocument = await trpc.uploadDocument.mutate(uploadData);
      setDocuments(prev => [newDocument, ...prev]);
      setTotalDocuments(prev => prev + 1);
      setIsUploadDialogOpen(false);
      setUploadFormData({
        filename: '',
        original_filename: '',
        file_type: 'PDF',
        file_size: 0,
        file_path: '',
        content_text: null,
        metadata: null,
        upload_source: 'WEB_INTERFACE',
        external_service_id: null
      });
    } catch (error) {
      console.error('Errore nel caricamento:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument) return;

    setIsLoading(true);
    try {
      const updatedDocument = await trpc.updateDocument.mutate({
        id: selectedDocument.id,
        filename: editFormData.filename,
        content_text: editFormData.content_text || null
      });
      
      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocument.id ? updatedDocument : doc
      ));
      setIsEditDialogOpen(false);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Errore nella modifica:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (documentId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteDocument.mutate({ id: documentId });
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setTotalDocuments(prev => prev - 1);
    } catch (error) {
      console.error('Errore nella cancellazione:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    loadDocuments(0, false);
  }, [loadDocuments]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDocuments(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchDocuments]);

  // Helper functions
  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF': return <FileText className="h-4 w-4" />;
      case 'JPEG': return <Image className="h-4 w-4" />;
      case 'JSON': return <File className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const displayedDocuments = searchQuery.trim() ? searchResults : documents;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-orange-200">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-[#FE3F27] to-[#fc7d6e] rounded-full flex items-center justify-center">
              <Archive className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Archivio Digitale
            </CardTitle>
            <CardDescription className="text-gray-600">
              Il tuo archivio personale di documenti nel cloud
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Accedi</TabsTrigger>
                <TabsTrigger value="register">Registrati</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Il tuo nome"
                      value={authFormData.name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthFormData(prev => ({ ...prev, name: e.target.value }))
                      }
                      required
                      className="border-orange-200 focus:border-[#FE3F27]"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="la-tua-email@esempio.com"
                    value={authFormData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthFormData(prev => ({ ...prev, email: e.target.value }))
                    }
                    required
                    className="border-orange-200 focus:border-[#FE3F27]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password sicura"
                    value={authFormData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthFormData(prev => ({ ...prev, password: e.target.value }))
                    }
                    required
                    className="border-orange-200 focus:border-[#FE3F27]"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-[#FE3F27] to-[#fc7d6e] hover:from-[#e6391f] hover:to-[#e96b5e] text-white font-medium py-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Caricamento...' : (authMode === 'login' ? 'Accedi' : 'Crea Account')}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white border-b border-orange-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-[#FE3F27] to-[#fc7d6e] rounded-lg flex items-center justify-center">
                <Archive className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Archivio Digitale</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Benvenuto, {user?.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-orange-200 text-[#FE3F27] hover:bg-orange-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Actions Bar */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Cerca nei tuoi documenti..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10 border-orange-200 focus:border-[#FE3F27]"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select value={selectedFileType} onValueChange={(value) => setSelectedFileType(value as 'JPEG' | 'PDF' | 'JSON' | 'all')}>
                <SelectTrigger className="w-32 border-orange-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="JPEG">JPEG</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                </SelectContent>
              </Select>
              
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-[#FE3F27] to-[#fc7d6e] hover:from-[#e6391f] hover:to-[#e96b5e] text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Carica
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Carica Nuovo Documento</DialogTitle>
                    <DialogDescription>
                      Aggiungi un nuovo documento al tuo archivio personale
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="filename">Nome del file</Label>
                      <Input
                        id="filename"
                        value={uploadFormData.filename || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUploadFormData(prev => ({ ...prev, filename: e.target.value }))
                        }
                        placeholder="documento.pdf"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="originalFilename">Nome originale</Label>
                      <Input
                        id="originalFilename"
                        value={uploadFormData.original_filename || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUploadFormData(prev => ({ ...prev, original_filename: e.target.value }))
                        }
                        placeholder="documento_originale.pdf"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fileType">Tipo di file</Label>
                      <Select 
                        value={uploadFormData.file_type || 'PDF'} 
                        onValueChange={(value) => setUploadFormData(prev => ({ ...prev, file_type: value as 'JPEG' | 'PDF' | 'JSON' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PDF">PDF</SelectItem>
                          <SelectItem value="JPEG">JPEG</SelectItem>
                          <SelectItem value="JSON">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fileSize">Dimensione (bytes)</Label>
                      <Input
                        id="fileSize"
                        type="number"
                        value={uploadFormData.file_size || 0}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUploadFormData(prev => ({ ...prev, file_size: parseInt(e.target.value) || 0 }))
                        }
                        min="1"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="filePath">Percorso del file</Label>
                      <Input
                        id="filePath"
                        value={uploadFormData.file_path || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUploadFormData(prev => ({ ...prev, file_path: e.target.value }))
                        }
                        placeholder="/uploads/documento.pdf"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contentText">Contenuto testuale (opzionale)</Label>
                      <Textarea
                        id="contentText"
                        value={uploadFormData.content_text || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setUploadFormData(prev => ({ ...prev, content_text: e.target.value || null }))
                        }
                        placeholder="Testo estratto dal documento per la ricerca..."
                        rows={3}
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsUploadDialogOpen(false)}
                      >
                        Annulla
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-gradient-to-r from-[#FE3F27] to-[#fc7d6e] hover:from-[#e6391f] hover:to-[#e96b5e] text-white"
                      >
                        {isLoading ? 'Caricamento...' : 'Carica'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span>📁 {totalDocuments} documenti totali</span>
            {searchQuery && (
              <span>🔍 {searchResults.length} risultati per "{searchQuery}"</span>
            )}
            {isSearching && <span>Ricerca in corso...</span>}
          </div>
        </div>

        {/* Documents Grid */}
        {isLoading && documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE3F27] mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento documenti...</p>
          </div>
        ) : displayedDocuments.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'Nessun risultato trovato' : 'Nessun documento'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Prova con parole chiave diverse o rimuovi i filtri.' 
                : 'Inizia caricando il tuo primo documento nell\'archivio.'
              }
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsUploadDialogOpen(true)}
                className="bg-gradient-to-r from-[#FE3F27] to-[#fc7d6e] hover:from-[#e6391f] hover:to-[#e96b5e] text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Carica il primo documento
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedDocuments.map((document: Document) => (
              <Card key={document.id} className="hover:shadow-lg transition-all duration-200 border-orange-100 hover:border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-gradient-to-r from-[#FE3F27] to-[#fc7d6e] rounded-lg text-white">
                        {getFileTypeIcon(document.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate">
                          {document.filename}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {document.original_filename}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {document.file_type}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {document.content_text && (
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {document.content_text.substring(0, 120)}...
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {document.created_at.toLocaleDateString('it-IT')}
                      </span>
                      <span>{formatFileSize(document.file_size)}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(document);
                            setIsViewDialogOpen(true);
                          }}
                          className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-[#FE3F27]"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(document);
                            setEditFormData({
                              filename: document.filename,
                              content_text: document.content_text || ''
                            });
                            setIsEditDialogOpen(true);
                          }}
                          className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-[#FE3F27]"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                              <AlertDialogDescription>
                                Sei sicuro di voler eliminare "{document.filename}"? Questa azione non può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(document.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      
                      {document.upload_source === 'EXTERNAL_SERVICE' && (
                        <Badge variant="outline" className="text-xs">
                          📡 Esterno
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!searchQuery && hasMore && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => {
                const nextPage = currentPage + 1;
                setCurrentPage(nextPage);
                loadDocuments(nextPage, true);
              }}
              disabled={isLoading}
              className="border-orange-200 text-[#FE3F27] hover:bg-orange-50"
            >
              {isLoading ? 'Caricamento...' : 'Carica altri documenti'}
            </Button>
          </div>
        )}

        {/* View Document Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {selectedDocument && getFileTypeIcon(selectedDocument.file_type)}
                <span>{selectedDocument?.filename}</span>
              </DialogTitle>
              <DialogDescription>
                Dettagli del documento - {selectedDocument?.original_filename}
              </DialogDescription>
            </DialogHeader>
            
            {selectedDocument && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">Tipo di file</Label>
                    <p>{selectedDocument.file_type}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Dimensione</Label>
                    <p>{formatFileSize(selectedDocument.file_size)}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Creato il</Label>
                    <p>{selectedDocument.created_at.toLocaleString('it-IT')}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Sorgente</Label>
                    <p>{selectedDocument.upload_source === 'WEB_INTERFACE' ? 'Interfaccia Web' : 'Servizio Esterno'}</p>
                  </div>
                </div>
                
                {selectedDocument.content_text && (
                  <div>
                    <Label className="font-medium">Contenuto testuale</Label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md max-h-60 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap text-gray-700">
                        {selectedDocument.content_text}
                      </pre>
                    </div>
                  </div>
                )}
                
                {selectedDocument.metadata && (
                  <div>
                    <Label className="font-medium">Metadata</Label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md max-h-40 overflow-y-auto">
                      <pre className="text-xs text-gray-600">
                        {JSON.stringify(selectedDocument.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Document Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifica Documento</DialogTitle>
              <DialogDescription>
                Aggiorna le informazioni del documento
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editFilename">Nome del file</Label>
                <Input
                  id="editFilename"
                  value={editFormData.filename}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData(prev => ({ ...prev, filename: e.target.value }))
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editContentText">Contenuto testuale</Label>
                <Textarea
                  id="editContentText"
                  value={editFormData.content_text}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditFormData(prev => ({ ...prev, content_text: e.target.value }))
                  }
                  rows={6}
                  placeholder="Aggiorna il contenuto testuale del documento..."
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedDocument(null);
                  }}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#FE3F27] to-[#fc7d6e] hover:from-[#e6391f] hover:to-[#e96b5e] text-white"
                >
                  {isLoading ? 'Salvando...' : 'Salva Modifiche'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default App;
