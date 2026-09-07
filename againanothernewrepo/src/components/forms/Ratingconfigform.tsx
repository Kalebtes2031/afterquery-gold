// src/components/forms/RatingConfigForm.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "add" | "edit" | "view";

interface Question {
  id: string;
  text: string;
  type: "rating" | "text" | "yesno";
  required: boolean;
}

const RatingConfigForm = ({ mode }: { mode: Mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    questions: [
      {
        id: crypto.randomUUID(),
        text: "How satisfied are you with our service?",
        type: "rating",
        required: true,
      },
    ],
    // Eligibility
    minDeliveredOrders: 2,
    maxDeliveredOrders: "",
    excludeRecentRaters: true,
    daysBeforeRerate: 90,
    // Display settings
    triggerType: "onPage" as "onPage" | "afterAction",
    selectedPages: ["dashboard"] as string[],
    afterAction: "orderPlaced" as "orderPlaced" | "orderDelivered",
    delaySeconds: 180, // 3 minutes
  });

  const isView = mode === "view";
  const isAdd = mode === "add";
  const isEdit = mode === "edit";

  const availablePages = [
    { value: "dashboard", label: "Dashboard" },
    { value: "myOrders", label: "My Orders" },
    { value: "invoices", label: "Invoices" },
    { value: "trackLaundry", label: "Track Laundry" },
  ];

  useEffect(() => {
    if ((isEdit || isView) && id) {
      const fetchConfig = async () => {
        const snap = await getDoc(doc(db, "ratingConfigs", id));
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            name: data.name || "",
            description: data.description || "",
            isActive: data.isActive ?? true,
            questions: data.questions || [],
            minDeliveredOrders: data.eligibility?.minDeliveredOrders || 2,
            maxDeliveredOrders: data.eligibility?.maxDeliveredOrders || "",
            excludeRecentRaters: data.eligibility?.excludeRecentRaters ?? true,
            daysBeforeRerate: data.eligibility?.daysBeforeRerate || 90,
            triggerType: data.displaySettings?.triggerType || "onPage",
            selectedPages: data.displaySettings?.pages || ["dashboard"],
            afterAction: data.displaySettings?.afterAction || "orderPlaced",
            delaySeconds: data.displaySettings?.delaySeconds || 180,
          });
        }
      };
      fetchConfig();
    }
  }, [id, mode]);

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          id: crypto.randomUUID(),
          text: "",
          type: "text",
          required: false,
        },
      ],
    });
  };

  const removeQuestion = (questionId: string) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((q) => q.id !== questionId),
    });
  };

  const updateQuestion = (
    questionId: string,
    field: keyof Question,
    value: any,
  ) => {
    setFormData({
      ...formData,
      questions: formData.questions.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q,
      ),
    });
  };

  const togglePage = (page: string) => {
    const isSelected = formData.selectedPages.includes(page);
    setFormData({
      ...formData,
      selectedPages: isSelected
        ? formData.selectedPages.filter((p) => p !== page)
        : [...formData.selectedPages, page],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        toast.error("Campaign name is required");
        return;
      }

      if (formData.questions.length === 0) {
        toast.error("Add at least one question");
        return;
      }

      const hasEmptyQuestions = formData.questions.some((q) => !q.text.trim());
      if (hasEmptyQuestions) {
        toast.error("All questions must have text");
        return;
      }

      if (
        formData.triggerType === "onPage" &&
        formData.selectedPages.length === 0
      ) {
        toast.error("Select at least one page for the rating popup");
        return;
      }

      const configData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive,
        questions: formData.questions,
        eligibility: {
          minDeliveredOrders: Number(formData.minDeliveredOrders),
          maxDeliveredOrders: formData.maxDeliveredOrders
            ? Number(formData.maxDeliveredOrders)
            : null,
          excludeRecentRaters: formData.excludeRecentRaters,
          daysBeforeRerate: formData.excludeRecentRaters
            ? Number(formData.daysBeforeRerate)
            : null,
        },
        displaySettings: {
          triggerType: formData.triggerType,
          pages:
            formData.triggerType === "onPage" ? formData.selectedPages : null,
          afterAction:
            formData.triggerType === "afterAction"
              ? formData.afterAction
              : null,
          delaySeconds:
            formData.triggerType === "onPage"
              ? Number(formData.delaySeconds)
              : null,
        },
        updatedAt: serverTimestamp(),
      };

      if (isAdd) {
        const newDocRef = doc(db, "ratingConfigs", crypto.randomUUID());
        await setDoc(newDocRef, {
          ...configData,
          createdAt: serverTimestamp(),
        });
        toast.success("Rating campaign created successfully");
      }

      if (isEdit && id) {
        await updateDoc(doc(db, "ratingConfigs", id), configData);
        toast.success("Rating campaign updated successfully");
      }

      navigate("/lms/manager/rating-configs");
    } catch (err: any) {
      console.error("Rating config operation error:", err);
      toast.error(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {isAdd
            ? "Create Rating Campaign"
            : isEdit
              ? "Edit Campaign"
              : "Campaign Details"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={isView}
                  placeholder="e.g., Q1 2026 Customer Feedback"
                  required={!isView}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Active Status
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                    disabled={isView}
                  />
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isActive
                    ? "Campaign is active"
                    : "Campaign is paused"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={isView}
                placeholder="Internal notes about this campaign..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rating Questions</CardTitle>
              {!isView && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.questions.map((question, index) => (
              <div
                key={question.id}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label>Question {index + 1} *</Label>
                      <Input
                        value={question.text}
                        onChange={(e) =>
                          updateQuestion(question.id, "text", e.target.value)
                        }
                        disabled={isView}
                        placeholder="Enter your question..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={question.type}
                          onValueChange={(val) =>
                            updateQuestion(question.id, "type", val)
                          }
                          disabled={isView}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rating">
                              Star Rating (1-5)
                            </SelectItem>
                            <SelectItem value="text">Text Answer</SelectItem>
                            <SelectItem value="yesno">Yes/No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 mt-8">
                        <Checkbox
                          id={`required-${question.id}`}
                          checked={question.required}
                          onCheckedChange={(checked) =>
                            updateQuestion(question.id, "required", checked)
                          }
                          disabled={isView}
                        />
                        <Label htmlFor={`required-${question.id}`}>
                          Required
                        </Label>
                      </div>
                    </div>
                  </div>

                  {!isView && formData.questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(question.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Eligibility */}
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Delivered Orders *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minDeliveredOrders}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minDeliveredOrders: Number(e.target.value),
                    })
                  }
                  disabled={isView}
                />
                <p className="text-xs text-muted-foreground">
                  Only show to customers with this many completed orders
                </p>
              </div>

              <div className="space-y-2">
                <Label>Maximum Delivered Orders (Optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.maxDeliveredOrders}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDeliveredOrders: e.target.value,
                    })
                  }
                  disabled={isView}
                  placeholder="Leave empty for no limit"
                />
                <p className="text-xs text-muted-foreground">
                  Don't show to customers above this order count
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="exclude-recent"
                  checked={formData.excludeRecentRaters}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, excludeRecentRaters: !!checked })
                  }
                  disabled={isView}
                />
                <Label htmlFor="exclude-recent">
                  Exclude customers who rated recently
                </Label>
              </div>

              {formData.excludeRecentRaters && (
                <div className="ml-6 space-y-2">
                  <Label>Days before allowing re-rate</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.daysBeforeRerate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        daysBeforeRerate: Number(e.target.value),
                      })
                    }
                    disabled={isView}
                  />
                  <p className="text-xs text-muted-foreground">
                    Customers can rate again after this many days
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Trigger Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>When to show rating popup</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(val: "onPage" | "afterAction") =>
                  setFormData({ ...formData, triggerType: val })
                }
                disabled={isView}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onPage">
                    On specific pages (with delay)
                  </SelectItem>
                  <SelectItem value="afterAction">
                    After specific action
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.triggerType === "onPage" && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select Pages</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {availablePages.map((page) => (
                      <div key={page.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`page-${page.value}`}
                          checked={formData.selectedPages.includes(page.value)}
                          onCheckedChange={() => togglePage(page.value)}
                          disabled={isView}
                        />
                        <Label htmlFor={`page-${page.value}`}>
                          {page.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Delay (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.delaySeconds}
                    onChange={(e) =>
                      setFormData({ ...formData, delaySeconds: Number(e.target.value) })
                    }
                    disabled={isView}
                  />
                  <p className="text-xs text-muted-foreground">
                    Wait this long before showing popup (e.g., 180 = 3 minutes)
                  </p>
                </div>
              </div>
            )}

            {formData.triggerType === "afterAction" && (
              <div className="space-y-2 pt-4">
                <Label>Trigger After</Label>
                <Select
                  value={formData.afterAction}
                  onValueChange={(val: "orderPlaced" | "orderDelivered") =>
                    setFormData({ ...formData, afterAction: val })
                  }
                  disabled={isView}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orderPlaced">
                      Order Successfully Placed
                    </SelectItem>
                    <SelectItem value="orderDelivered">
                      Order Delivered
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Popup appears immediately after this action completes
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            {isView ? "Back" : "Cancel"}
          </Button>
          {!isView && (
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {loading
                ? "Saving..."
                : isAdd
                  ? "Create Campaign"
                  : "Save Changes"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RatingConfigForm;
