// components/load/CreateTransporterGroupModal.tsx
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/custom/button'
import { useToast } from '@/components/ui/use-toast'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2 } from 'lucide-react'
import { mastersService } from '@/api/services/masters/masters.service'
import { masterGroupsService } from '@/api/services/master-groups/master-groups.service'

interface CreateTransporterGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transporters: Array<{ _id: string; name: string; companyName?: string }>
  onSuccess: () => void
}

export function CreateTransporterGroupModal({
  open,
  onOpenChange,
  transporters,
  onSuccess,
}: CreateTransporterGroupModalProps) {
  const { toast } = useToast()
  const [groupName, setGroupName] = useState('')
  const [selectedTransporters, setSelectedTransporters] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!groupName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a group name',
        variant: 'destructive',
      })
      return
    }

    if (selectedTransporters.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one transporter',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)

      const groupsResult = await masterGroupsService.list({ search: 'TRANSPORTER_GROUP' })
      const transporterGroup = groupsResult.data.find((g: any) => g.code === 'TRANSPORTER_GROUP')

      if (!transporterGroup) {
        throw new Error('TRANSPORTER_GROUP not found. Please create it in Master Groups first.')
      }

      await mastersService.create({
        groupId: transporterGroup._id,
        name: groupName,
        code: groupName.toLowerCase().replace(/\s+/g, '-'),
        value: groupName.toLowerCase().replace(/\s+/g, '-'),
        description: selectedTransporters.join(','),
        status: 'active',
      })

      toast({
        title: 'Success',
        description: `Group "${groupName}" created successfully`,
      })

      setGroupName('')
      setSelectedTransporters([])
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error('Failed to create group:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create group',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Transporter Group</DialogTitle>
          <DialogDescription>
            Create a group to quickly select multiple transporters at once
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name *</label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Premium Transporters, Regional Fleet"
              disabled={isSubmitting}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select Transporters * ({selectedTransporters.length} selected)
            </label>
            <SearchableSelect
              value={selectedTransporters}
              onChange={(value) => setSelectedTransporters(value as string[])}
              options={transporters.map((t) => ({
                value: t._id,
                label: t.companyName || t.name,
              }))}
              placeholder="Select transporters for this group"
              searchPlaceholder="Search transporters..."
              multiple={true}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}