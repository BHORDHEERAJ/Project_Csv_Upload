<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MappingConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MappingController extends Controller
{
    public function index()
    {
        return response()->json(MappingConfiguration::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:mapping_configurations,name',
            'display_name' => 'required|string',
            'document_type' => 'required|string',
            'mapping_rules' => 'required|array',
        ]);

        $config = MappingConfiguration::create([
            'uuid' => (string) Str::uuid(),
            'name' => $request->name,
            'display_name' => $request->display_name,
            'document_type' => $request->document_type,
            'mapping_rules' => $request->mapping_rules,
            'created_by' => auth()->id(),
        ]);

        return response()->json($config, 201);
    }

    public function show($id)
    {
        return response()->json(MappingConfiguration::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $config = MappingConfiguration::findOrFail($id);
        $config->update($request->all());
        return response()->json($config);
    }

    public function destroy($id)
    {
        $config = MappingConfiguration::findOrFail($id);
        if ($config->is_system) {
            return response()->json(['error' => 'System mappings cannot be deleted'], 403);
        }
        $config->delete();
        return response()->json(['message' => 'Mapping deleted']);
    }
}
