'use client';

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Star, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function ResumePage() {
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.get('/resumes').then((r) => r.data.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('name', file.name.replace(/\.[^/.]+$/, ''));
      return api.post('/resumes/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      toast.success('Resume uploaded! AI parsing started...');
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Upload failed'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/resumes/${id}/set-default`),
    onSuccess: () => {
      toast.success('Default resume updated');
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/resumes/${id}`),
    onSuccess: () => {
      toast.success('Resume deleted');
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });

  const reparseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/resumes/${id}/reparse`),
    onSuccess: () => {
      toast.success('Re-parsing started…');
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
    onError: () => toast.error('Failed to re-queue parse'),
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) uploadMutation.mutate(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'processing': return <Clock className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Resume Manager</h1>
        <p className="text-muted-foreground mt-1">Upload your resume for AI-powered parsing and optimization</p>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
          isDragActive ? 'border-brand-500 bg-brand-50 dark:bg-brand-950' : 'border-border hover:border-brand-400 hover:bg-muted/50',
          uploadMutation.isPending && 'opacity-60 pointer-events-none',
        )}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 mx-auto mb-4 gradient-brand rounded-2xl flex items-center justify-center">
          {uploadMutation.isPending ? (
            <div className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin" />
          ) : <Upload className="w-8 h-8 text-white" />}
        </div>
        <h3 className="font-semibold text-lg mb-1">
          {isDragActive ? 'Drop your resume here' : uploadMutation.isPending ? 'Uploading...' : 'Upload your resume'}
        </h3>
        <p className="text-muted-foreground text-sm">Drag and drop or click to select • PDF or DOCX • Max 10MB</p>
      </div>

      {/* Resume list */}
      {!isLoading && resumes.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Your Resumes</h2>
          <AnimatePresence>
            {resumes.map((resume: any) => (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn('p-4 rounded-2xl border bg-card', resume.isDefault && 'border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/50')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{resume.name}</h3>
                        {resume.isDefault && <span className="text-xs bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-medium">Default</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{resume.format}</span>
                        <span className="text-xs text-muted-foreground">{Math.round(resume.fileSize / 1024)}KB</span>
                        <div className="flex items-center gap-1 text-xs">
                          {getStatusIcon(resume.parseStatus)}
                          <span className="text-muted-foreground capitalize">{resume.parseStatus}</span>
                        </div>
                        {resume.parsedProfile?.atsScore && (
                          <span className="text-xs font-medium text-green-600">ATS: {resume.parsedProfile.atsScore}%</span>
                        )}
                      </div>
                      {Array.isArray(resume.parsedProfile?.skills) && resume.parsedProfile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(resume.parsedProfile.skills as string[]).slice(0, 5).map((s: string) => (
                            <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded-md">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {resume.parseStatus === 'failed' && (
                      <button
                        onClick={() => reparseMutation.mutate(resume.id)}
                        disabled={reparseMutation.isPending}
                        className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-500 transition-colors"
                        title="Retry parsing"
                      >
                        <RefreshCw className={`w-4 h-4 ${reparseMutation.isPending ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    {!resume.isDefault && (
                      <button onClick={() => setDefaultMutation.mutate(resume.id)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors" title="Set as default">
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setSelectedResume(resume.id === selectedResume ? null : resume.id)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-brand-600 transition-colors" title="AI Insights">
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(resume.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI Insights Panel */}
                <AnimatePresence>
                  {selectedResume === resume.id && resume.parsedProfile && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-3 rounded-xl bg-muted">
                          <div className="text-2xl font-bold text-green-600">{resume.parsedProfile.atsScore || '-'}</div>
                          <div className="text-xs text-muted-foreground">ATS Score</div>
                        </div>
                        <div className="p-3 rounded-xl bg-muted">
                          <div className="text-2xl font-bold text-brand-600">{(resume.parsedProfile.skills as any[])?.length || 0}</div>
                          <div className="text-xs text-muted-foreground">Skills Found</div>
                        </div>
                        <div className="p-3 rounded-xl bg-muted">
                          <div className="text-2xl font-bold text-purple-600">{resume.parsedProfile.totalExperienceYears?.toFixed(1) || '-'}</div>
                          <div className="text-xs text-muted-foreground">Years Exp</div>
                        </div>
                        <div className="p-3 rounded-xl bg-muted">
                          <div className="text-2xl font-bold text-orange-600">{resume.parsedProfile.readabilityScore || '-'}</div>
                          <div className="text-xs text-muted-foreground">Readability</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
