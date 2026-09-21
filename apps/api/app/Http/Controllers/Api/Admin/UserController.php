<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    use Paginates;

    public function index(Request $request): JsonResponse
    {
        $q = User::query()->whereNotNull('staff_tier')->with('roles:id,name')->orderBy('name');
        $actor = $request->user();
        if (! $actor->hasRole('super_admin')) {
            $q->where('department', $actor->department);
        }

        return $this->page($q->paginate(50), fn (User $u) => $this->present($u));
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email:rfc|max:255|unique:users,email',
            'phone' => 'nullable|string|regex:/^\d{10,15}$/',
            'department' => ['required', Rule::in(array_keys(config('rbac.departments')))],
            'tier' => ['required', Rule::in(['admin', 'staff'])],
        ]);

        $this->assertMayProvision($actor, $data['department'], $data['tier']);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'department' => $data['department'],
            'staff_tier' => $data['tier'],
            'is_active' => true,
            // Random secret nobody knows: the person sets their own via the emailed reset link.
            'password' => Str::random(40),
        ]);
        $user->assignRole("{$data['department']}.{$data['tier']}");
        Password::sendResetLink(['email' => $user->email]);

        AuditLog::record('user.created', $user, null, ['email' => $user->email, 'department' => $data['department'], 'tier' => $data['tier']]);

        return response()->json(['data' => $this->present($user), 'message' => 'Account created. A link to set the password was emailed.'], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        abort_if($user->staff_tier === null, 404);
        $this->assertMayManage($actor, $user);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:120',
            'phone' => 'sometimes|nullable|string|regex:/^\d{10,15}$/',
            'is_active' => 'sometimes|boolean',
            'department' => ['sometimes', Rule::in(array_keys(config('rbac.departments')))],
            'tier' => ['sometimes', Rule::in(['admin', 'staff'])],
        ]);

        if (isset($data['is_active']) && ! $data['is_active'] && $user->id === $actor->id) {
            throw ValidationException::withMessages(['is_active' => 'You cannot deactivate your own account.']);
        }

        $moving = isset($data['department']) || isset($data['tier']);
        if ($moving) {
            if (! $actor->hasRole('super_admin')) {
                throw ValidationException::withMessages(['department' => 'Only a Super Admin can change department or tier.']);
            }
            if ($user->hasRole('super_admin')) {
                throw ValidationException::withMessages(['department' => 'Super Admin accounts are managed from the command line.']);
            }
        }

        $before = $user->only(['name', 'phone', 'is_active', 'department', 'staff_tier']);
        $dept = $data['department'] ?? $user->department;
        $tier = $data['tier'] ?? $user->staff_tier;

        $user->update(array_filter([
            'name' => $data['name'] ?? null,
            'department' => $moving ? $dept : null,
            'staff_tier' => $moving ? $tier : null,
        ], fn ($v) => $v !== null) + array_intersect_key($data, array_flip(['phone', 'is_active'])));

        if ($moving) {
            $user->syncRoles(["{$dept}.{$tier}"]);
        }
        if (isset($data['is_active']) && ! $data['is_active']) {
            $user->tokens()->delete();
        }

        AuditLog::record('user.updated', $user, $before, $user->only(['name', 'phone', 'is_active', 'department', 'staff_tier']));

        return response()->json(['data' => $this->present($user->fresh() ?? $user)]);
    }

    /** Super Admin may create anyone; a department Admin only staff in their own department. */
    private function assertMayProvision(User $actor, string $department, string $tier): void
    {
        if ($actor->hasRole('super_admin')) {
            return;
        }
        if ($department !== $actor->department || $tier !== 'staff') {
            throw ValidationException::withMessages(['department' => 'You can only create Staff accounts in your own department.']);
        }
    }

    private function assertMayManage(User $actor, User $target): void
    {
        if ($actor->hasRole('super_admin')) {
            return;
        }
        if ($target->department !== $actor->department || $target->staff_tier !== 'staff') {
            abort(403, 'You can only manage Staff accounts in your own department.');
        }
    }

    /** @return array<string, mixed> */
    private function present(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'department' => $u->department,
            'department_label' => $u->department ? config("rbac.departments.{$u->department}.label") : null,
            'tier' => $u->hasRole('super_admin') ? 'super_admin' : $u->staff_tier,
            'is_active' => $u->is_active,
        ];
    }
}
