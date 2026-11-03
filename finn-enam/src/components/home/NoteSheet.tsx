import React, { useEffect, useState } from 'react';
import { Lock, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useAlertNote, useNoteMutations } from '../../lib/queries';
import { dateTime } from '../../lib/format';
import type { NotificationItem } from '../../lib/types';
import { Drawer } from '../common/Drawer';
import { useToast } from '../common/Toast';
import { CompanyLogo } from '../company/CompanyLogo';
import { ErrorState, LoadingBlock, PrimaryButton, SecondaryButton, cx, inputCls } from '../ui';
import { headlineOf } from './AlertCard';

const MAX = 4000;

/**
 * Personal research note on one alert, in a bottom sheet: one editable note per user per alert,
 * saved to the server (so it follows the account across devices), deleted only after a
 * confirmation. On the shared reviewer account everyone using that login sees the same notes,
 * and the sheet says so.
 */
export const NoteSheet: React.FC<{ alert: NotificationItem | null; onClose: () => void }> = ({ alert, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();
  const note = useAlertNote(alert?.id ?? null);
  const { save, remove } = useNoteMutations(alert?.id ?? null);
  const [text, setText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setText(note.data?.content ?? '');
    setConfirmDelete(false);
  }, [note.data, alert?.id]);

  if (!alert) return null;
  const existing = note.data ?? null;
  const unchanged = text.trim() === (existing?.content ?? '').trim();
  const close = () => {
    save.reset();
    remove.reset();
    onClose();
  };

  return (
    <Drawer
      isOpen
      onClose={close}
      title="Personal Notes"
      subtitle={`${alert.company.nseSymbol ?? ''} · ${alert.company.name}`}
      leading={<CompanyLogo name={alert.company.name} nseSymbol={alert.company.nseSymbol} size="md" />}
      footer={
        confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[12.5px] text-ink dark:text-ink-light">Delete this note?</span>
            <SecondaryButton className="min-h-[40px] px-3" onClick={() => setConfirmDelete(false)}>
              Keep
            </SecondaryButton>
            <button
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(undefined, {
                  onSuccess: () => {
                    toast('Note deleted');
                    close();
                  },
                })
              }
              className="inline-flex min-h-[40px] items-center rounded-lg bg-fin-red px-3.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {existing && (
              <button onClick={() => setConfirmDelete(true)} className="mr-auto min-h-[40px] px-1 text-[12.5px] font-semibold text-fin-red">
                Delete
              </button>
            )}
            <SecondaryButton className={cx('min-h-[40px] px-3.5', !existing && 'ml-auto')} onClick={close}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              className="min-h-[40px] px-4"
              busy={save.isPending}
              disabled={!text.trim() || unchanged || note.isLoading}
              onClick={() =>
                save.mutate(text, {
                  onSuccess: () => {
                    toast(existing ? 'Note updated' : 'Note saved');
                    close();
                  },
                })
              }
            >
              Save
            </PrimaryButton>
          </div>
        )
      }
    >
      <div className="space-y-3">
        <p className="rounded-lg border-l-2 border-forest/40 bg-cream-light px-3 py-2 text-[12.5px] leading-snug text-ink dark:border-emerald/40 dark:bg-ink-surfaceSubtle dark:text-ink-light">{headlineOf(alert)}</p>
        {note.isLoading ? (
          <LoadingBlock rows={1} />
        ) : note.isError ? (
          <ErrorState error={note.error} onRetry={() => note.refetch()} />
        ) : (
          <>
            <label className="block">
              <span className="sr-only">Personal note</span>
              <textarea
                autoFocus
                className={cx(inputCls, 'min-h-[150px] resize-y leading-relaxed')}
                value={text}
                maxLength={MAX}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add your research observations, questions or follow-up points..."
              />
            </label>
            <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
              <span>{existing ? `Last updated ${dateTime(existing.updatedAt)}` : 'Not saved yet'}</span>
              <span className="font-mono">
                {text.length.toLocaleString('en-IN')}/{MAX.toLocaleString('en-IN')}
              </span>
            </div>
          </>
        )}
        {(save.isError || remove.isError) && <ErrorState error={save.error ?? remove.error} />}
        <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-muted">
          {user?.isDemoAccount ? (
            <>
              <Users size={13} className="mt-px shrink-0" /> This is the shared reviewer account: everyone signed in with it sees the same notes.
            </>
          ) : (
            <>
              <Lock size={13} className="mt-px shrink-0" /> Only you can see this note. It stays with the alert when you archive or restore it.
            </>
          )}
        </p>
      </div>
    </Drawer>
  );
};
